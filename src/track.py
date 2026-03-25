# src/track.py — Production football tracking pipeline
# Improvements over previous version:
#   - Ellipses at player feet instead of bounding boxes
#   - Ball trail + triangle pointer (no delay on detected frames)
#   - Player movement trails
#   - Speed estimation per player
#   - Camera movement compensation via optical flow
#   - Pandas ball interpolation for missing frames
#   - Possession always A+B=100%, frozen when ball not visible

import cv2
import yaml
import json
import argparse
import numpy as np
import pandas as pd
from pathlib import Path
from collections import deque, defaultdict
from ultralytics import YOLO


def create_compatible_video_writer(path: Path, fps: int, size: tuple[int, int]):
    """Create a VideoWriter with the most browser-friendly codec available."""
    # Prefer mp4v first to avoid OpenH264 runtime dependency issues; we transcode later.
    codec_candidates = ['mp4v', 'avc1', 'H264']
    for codec in codec_candidates:
        writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*codec), fps, size)
        if writer.isOpened():
            print(f'Video writer codec selected: {codec}')
            return writer
        writer.release()
    raise RuntimeError('Could not open video writer with mp4v/avc1/H264 codecs')

# ── paths ──────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / 'models' / 'best_overall.pt'

with open(ROOT / 'params.yaml', encoding='utf-8') as f:
    params = yaml.safe_load(f)

T  = params['tracker']
TC = params['team_classifier']
P  = params['possession']

# ── team display colours (BGR) ─────────────────────────────────────────────────
TEAM_COLORS = {
    0:  (0,   165, 255),   # Team A — orange
    1:  (255,  50,  50),   # Team B — blue
   -1:  (180, 180, 180),   # unknown / referee — grey
}
BALL_COLOR      = (0, 255, 255)   # cyan
BALL_TRAIL_COLOR = (0, 200, 200)


# ══════════════════════════════════════════════════════════════════════════════
# DRAWING HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def draw_player_box(frame, x1, y1, x2, y2, color, track_id,
                    team_label, conf, speed_kmh=None):
    """Draw original-style bounding boxes without per-player ID labels."""
    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)


def draw_ball_pointer(frame, cx, cy, detected: bool):
    """Draw original-style ball pointer without trailing history."""
    if cx is None:
        return

    col = BALL_COLOR if detected else (0, 140, 140)
    cv2.circle(frame, (cx, cy), 8, col, -1)
    cv2.circle(frame, (cx, cy), 9, (255, 255, 255), 1)

    pts = np.array([
        [cx,      cy - 18],
        [cx - 7,  cy - 10],
        [cx + 7,  cy - 10],
    ], np.int32)
    cv2.fillPoly(frame, [pts], col)
    cv2.polylines(frame, [pts], True, (255, 255, 255), 1)


def draw_player_trail(frame, positions: list, color):
    """Draws a fading movement trail for a player."""
    for i in range(1, len(positions)):
        alpha  = i / len(positions)
        thick  = max(1, int(2 * alpha))
        col    = tuple(int(c * alpha * 0.7) for c in color)
        cv2.line(frame, positions[i-1], positions[i], col, thick)


def draw_possession_hud(frame, stats, width, current_team):
    """Semi-transparent HUD panel with possession bar and current team indicator."""
    overlay = frame.copy()
    cv2.rectangle(overlay, (8, 8), (320, 115), (15, 15, 15), -1)
    frame[:] = cv2.addWeighted(overlay, 0.6, frame, 0.4, 0)

    cv2.putText(frame, f'Team A: {stats["team_a"]:5.1f}%',
                (15, 38), cv2.FONT_HERSHEY_SIMPLEX,
                0.7, TEAM_COLORS[0], 2)
    cv2.putText(frame, f'Team B: {stats["team_b"]:5.1f}%',
                (15, 68), cv2.FONT_HERSHEY_SIMPLEX,
                0.7, TEAM_COLORS[1], 2)

    # possession bar
    bx, by, bw, bh = 8, 78, int(312 * 0.3), max(6, int(14 * 0.3))
    cv2.rectangle(frame, (bx, by), (bx+bw, by+bh), (50,50,50), -1)
    split = int(bw * stats['team_a'] / 100)
    cv2.rectangle(frame, (bx, by), (bx+split, by+bh), TEAM_COLORS[0], -1)
    cv2.rectangle(frame, (bx+split, by), (bx+bw, by+bh), TEAM_COLORS[1], -1)
    cv2.rectangle(frame, (bx, by), (bx+bw, by+bh), (200,200,200), 1)

    # "ball" indicator showing current possessing team
    if current_team in (0, 1):
        label = '● A' if current_team == 0 else '● B'
        col   = TEAM_COLORS[current_team]
        cv2.putText(frame, label,
                    (15, 106), cv2.FONT_HERSHEY_SIMPLEX,
                    0.55, col, 2)


# ══════════════════════════════════════════════════════════════════════════════
# CAMERA MOVEMENT ESTIMATOR
# Uses Lucas-Kanade optical flow on background corners to estimate
# how much the camera panned/tilted between frames.
# ══════════════════════════════════════════════════════════════════════════════

class CameraMovementEstimator:

    LK_PARAMS = dict(
        winSize=(15, 15),
        maxLevel=2,
        criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03),
    )
    FEATURE_PARAMS = dict(maxCorners=100, qualityLevel=0.3,
                          minDistance=7, blockSize=7)

    def __init__(self, first_frame):
        self.prev_gray    = cv2.cvtColor(first_frame, cv2.COLOR_BGR2GRAY)
        self.prev_pts     = None
        self.camera_delta = [0, 0]   # cumulative x,y camera drift
        self._refresh_points(self.prev_gray)

    def _refresh_points(self, gray):
        self.prev_pts = cv2.goodFeaturesToTrack(gray, **self.FEATURE_PARAMS)

    def update(self, frame):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        dx, dy = 0, 0

        if self.prev_pts is not None and len(self.prev_pts) >= 4:
            curr_pts, status, _ = cv2.calcOpticalFlowPyrLK(
                self.prev_gray, gray, self.prev_pts, None, **self.LK_PARAMS
            )
            if curr_pts is not None and status is not None:
                good_old = self.prev_pts[status.ravel() == 1]
                good_new = curr_pts[status.ravel() == 1]

                if len(good_old) >= 4:
                    # cv2 points may come as (N, 1, 2); normalize to (N, 2)
                    good_old = good_old.reshape(-1, 2)
                    good_new = good_new.reshape(-1, 2)
                    diff = good_new - good_old
                    # median is robust against player motion outliers
                    dx = float(np.median(diff[:, 0]))
                    dy = float(np.median(diff[:, 1]))

        self.camera_delta[0] += dx
        self.camera_delta[1] += dy
        self.prev_gray = gray
        self._refresh_points(gray)
        return dx, dy

    def adjust_position(self, x, y):
        """Subtract camera drift from an absolute pixel position."""
        return (x - self.camera_delta[0],
                y - self.camera_delta[1])


# ══════════════════════════════════════════════════════════════════════════════
# TEAM CLASSIFIER
# ══════════════════════════════════════════════════════════════════════════════

class TeamClassifier:

    def __init__(self):
        self.team_colors         = None
        self.track_teams         = {}
        self.track_color_history = defaultdict(list)
        self.calibrated          = False

    def _extract_jersey_color(self, frame, x1, y1, x2, y2):
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        H, W = frame.shape[:2]
        x1 = max(0, x1); y1 = max(0, y1)
        x2 = min(W, x2); y2 = min(H, y2)

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None

        ch, _ = crop.shape[:2]
        torso  = crop[int(ch * 0.2): int(ch * 0.75), :]
        if torso.size == 0:
            torso = crop

        hsv    = cv2.cvtColor(torso, cv2.COLOR_BGR2HSV)
        pixels = hsv.reshape(-1, 3).astype(np.float32)

        pitch = (pixels[:,0]>=35)&(pixels[:,0]<=85)&(pixels[:,1]>50)
        dark  = pixels[:,2] < 40
        pixels = pixels[~(pitch | dark)]

        return pixels.mean(axis=0) if len(pixels) >= 20 else None

    def calibrate(self, frame, player_detections):
        colors = []
        for (x1,y1,x2,y2) in player_detections[:30]:
            c = self._extract_jersey_color(frame, x1, y1, x2, y2)
            if c is not None:
                colors.append(c)

        if len(colors) < 4:
            return

        arr      = np.array(colors, dtype=np.float32)
        k        = min(3, len(arr))
        criteria = (cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
        _, labels, centers = cv2.kmeans(
            arr, k, None, criteria, 10, cv2.KMEANS_PP_CENTERS
        )

        counts = np.bincount(labels.flatten())
        top2   = np.argsort(-counts)[:2]
        self.team_colors = centers[top2]
        self.calibrated  = True

        h_a      = int(self.team_colors[0][0])
        h_b      = int(self.team_colors[1][0])
        hue_diff = abs(h_a - h_b)
        print(f'Team classifier calibrated:')
        print(f'  Team A HSV ≈ {self.team_colors[0].astype(int)}')
        print(f'  Team B HSV ≈ {self.team_colors[1].astype(int)}')
        print(f'  Hue difference: {hue_diff} degrees'
              + (' ⚠ similar kits' if hue_diff < 15 else ' ✓'))

    def classify(self, frame, track_id, x1, y1, x2, y2):
        if not self.calibrated:
            return -1

        color = self._extract_jersey_color(frame, x1, y1, x2, y2)
        if color is None:
            return self.track_teams.get(track_id, -1)

        hist = self.track_color_history[track_id]
        hist.append(color)
        if len(hist) > 15:
            hist.pop(0)

        avg   = np.mean(hist, axis=0)
        dists = [np.linalg.norm(avg - c) for c in self.team_colors]

        if min(dists) > 40:
            return -1

        team = int(np.argmin(dists))
        self.track_teams[track_id] = team
        return team


# ══════════════════════════════════════════════════════════════════════════════
# SPEED ESTIMATOR
# Estimates px/frame velocity → converts to km/h using a rough
# pitch-width scale factor (calibrated against standard pitch width).
# ══════════════════════════════════════════════════════════════════════════════

class SpeedEstimator:
    # Standard pitch: ~105m wide. Broadcast frame width ≈ 1920px.
    # → 1920px ≈ 105m  →  1px ≈ 0.055m
    # At 25fps: speed_m_s = dist_px/frame * 25 * 0.055
    PX_TO_M  = 0.055
    FPS_DEFAULT = 25

    def __init__(self, fps=25, window=5):
        self.fps    = fps or self.FPS_DEFAULT
        self.window = window                          # frames to average over
        self.history = defaultdict(lambda: deque(maxlen=window))

    def update(self, track_id, cx, cy):
        self.history[track_id].append((cx, cy))

    def get_speed_kmh(self, track_id):
        h = self.history[track_id]
        if len(h) < 2:
            return 0.0
        dx = h[-1][0] - h[0][0]
        dy = h[-1][1] - h[0][1]
        dist_px  = np.hypot(dx, dy)
        dist_m   = dist_px * self.PX_TO_M
        speed_ms = dist_m * self.fps / len(h)
        return speed_ms * 3.6   # m/s → km/h


# ══════════════════════════════════════════════════════════════════════════════
# BALL INTERPOLATOR
# Collects all detected positions, then fills missing frames using
# Pandas linear interpolation — same technique as the MatchVision project.
# In real-time mode we use a lightweight fallback instead.
# ══════════════════════════════════════════════════════════════════════════════

class BallInterpolator:
    """
    Two-phase ball tracker:
      Phase 1 (offline): collect all raw detections, interpolate gaps.
      Phase 2 (draw):    return interpolated position per frame index.

    For real-time mode: falls back to last known position (no averaging delay).
    """

    def __init__(self):
        self.raw    = {}     # frame_idx → (cx, cy) or None
        self.interp = {}     # frame_idx → (cx, cy)  — filled after interpolate()

    def record(self, frame_idx, pos):
        """Call during the first pass through the video."""
        self.raw[frame_idx] = pos

    def interpolate(self):
        """
        Call ONCE after the full first pass.
        Uses Pandas to fill gaps between detections.
        """
        if not self.raw:
            return

        max_frame = max(self.raw.keys())
        xs = [self.raw.get(i, (np.nan, np.nan))[0]
              if self.raw.get(i) else np.nan for i in range(max_frame+1)]
        ys = [self.raw.get(i, (np.nan, np.nan))[1]
              if self.raw.get(i) else np.nan for i in range(max_frame+1)]

        df = pd.DataFrame({'x': xs, 'y': ys})
        df = df.interpolate(method='linear', limit=30, limit_direction='both')

        for i, row in df.iterrows():
            if not np.isnan(row['x']):
                self.interp[i] = (int(row['x']), int(row['y']))
            else:
                self.interp[i] = None

    def get(self, frame_idx):
        """Returns interpolated position or None."""
        return self.interp.get(frame_idx)

    def was_detected(self, frame_idx):
        return self.raw.get(frame_idx) is not None


# ══════════════════════════════════════════════════════════════════════════════
# POSSESSION TRACKER — A+B=100%, frozen when ball not visible
# ══════════════════════════════════════════════════════════════════════════════

class PossessionTracker:

    def __init__(self, proximity_px=100, inertia_frames=5):
        self.proximity_px    = proximity_px
        self.inertia_frames  = inertia_frames
        self.current_team    = -1
        self.candidate_team  = -1
        self.candidate_count = 0
        self.possession_count = {0: 0, 1: 0}

    def update(self, ball_pos, player_tracks):
        # freeze when ball not visible — percentages stay as-is
        if ball_pos is None:
            return self.current_team

        classified = [t for t in player_tracks if t['team'] in (0, 1)]
        if len(classified) == 0:
            return self.current_team

        bx, by       = ball_pos
        min_dist     = float('inf')
        nearest_team = -1

        for t in classified:
            d = np.hypot(t['x_centre'] - bx, t['y_centre'] - by)
            if d < min_dist:
                min_dist     = d
                nearest_team = t['team']

        if min_dist > self.proximity_px:
            nearest_team = -1   # ball in air — last-touch rule

        if self.current_team == -1 and nearest_team != -1:
            self.current_team = nearest_team

        if nearest_team == -1:
            self.candidate_team  = -1
            self.candidate_count = 0

        elif nearest_team == self.current_team:
            self.candidate_team  = -1
            self.candidate_count = 0

        elif nearest_team == self.candidate_team:
            self.candidate_count += 1
            if self.candidate_count >= self.inertia_frames:
                self.current_team    = self.candidate_team
                self.candidate_team  = -1
                self.candidate_count = 0

        else:
            self.candidate_team  = nearest_team
            self.candidate_count = 1

        if self.current_team in (0, 1):
            self.possession_count[self.current_team] += 1

        return self.current_team

    def get_stats(self):
        total = sum(self.possession_count.values())
        if total == 0:
            return {'team_a': 50.0, 'team_b': 50.0,
                    'frames_team_a': 0, 'frames_team_b': 0}

        # Force A+B to be exactly 100.0 after rounding.
        team_a = round(self.possession_count[0] / total * 100, 1)
        team_b = round(100.0 - team_a, 1)

        return {
            'team_a':        team_a,
            'team_b':        team_b,
            'frames_team_a': self.possession_count[0],
            'frames_team_b': self.possession_count[1],
        }


# ══════════════════════════════════════════════════════════════════════════════
# HEATMAP GENERATOR
# ══════════════════════════════════════════════════════════════════════════════

class HeatmapGenerator:

    def __init__(self, width, height):
        self.width   = width
        self.height  = height
        self.heatmap = np.zeros((height, width), dtype=np.float32)

    def update(self, cx, cy, radius=14):
        x, y = int(cx), int(cy)
        if 0 <= x < self.width and 0 <= y < self.height:
            cv2.circle(self.heatmap, (x, y), radius, 1.0, -1)

    def render(self, path, title='Heatmap'):
        if self.heatmap.max() == 0:
            print(f'Heatmap empty — skipping {path}')
            return
        norm    = cv2.normalize(self.heatmap, None, 0, 255, cv2.NORM_MINMAX)
        colored = cv2.applyColorMap(norm.astype(np.uint8), cv2.COLORMAP_JET)
        cv2.putText(colored, title, (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255,255,255), 2)
        cv2.imwrite(str(path), colored)
        print(f'Heatmap saved: {path}')


# ══════════════════════════════════════════════════════════════════════════════
# MAIN PIPELINE — TWO-PASS APPROACH
#   Pass 1: detect everything, collect raw ball positions
#   Pass 2: interpolate ball gaps with Pandas, render final video
# ══════════════════════════════════════════════════════════════════════════════

def run_pipeline(video_path: str, output_dir: str = 'outputs') -> dict:

    video_path = Path(video_path).expanduser().resolve()
    out_dir    = Path(output_dir).expanduser()
    if not out_dir.is_absolute():
        out_dir = (ROOT / out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f'Model not found: {MODEL_PATH}')
    if not video_path.exists():
        raise FileNotFoundError(f'Video not found: {video_path}')

    stem         = video_path.stem
    output_video = out_dir / f'{stem}_tracked.mp4'
    heatmap_a    = out_dir / f'{stem}_heatmap_teamA.png'
    heatmap_b    = out_dir / f'{stem}_heatmap_teamB.png'
    stats_json   = out_dir / f'{stem}_stats.json'

    print('Loading YOLO model ...')
    model = YOLO(str(MODEL_PATH))

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f'Cannot open: {video_path}')

    fps    = int(cap.get(cv2.CAP_PROP_FPS)) or 25
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f'Video: {width}x{height} @ {fps}fps | {total} frames')

    # ════════════════════════════════════════════════════════════════════════
    # PASS 1 — detect & track, collect raw data
    # ════════════════════════════════════════════════════════════════════════
    print('\nPass 1/2 — detecting & collecting ball positions ...')

    ball_interp  = BallInterpolator()
    # frame_data[i] = list of track dicts for that frame
    frame_data   = {}
    frame_idx    = 0
    team_clf     = TeamClassifier()
    speed_est    = SpeedEstimator(fps=fps)

    # read first frame for camera estimator
    ok, first_frame = cap.read()
    if not ok:
        raise RuntimeError('Cannot read first frame')
    cam_est = CameraMovementEstimator(first_frame)
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # rewind

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        cam_est.update(frame)

        results = model.track(
            frame,
            tracker='bytetrack.yaml',
            persist=True,
            verbose=False,
            conf=T['conf_threshold'],
            iou=0.5,
        )[0]

        tracks        = []
        player_boxes  = []

        if results.boxes is not None:
            boxes   = results.boxes.xyxy.cpu().numpy()
            classes = results.boxes.cls.cpu().numpy().astype(int)
            confs   = results.boxes.conf.cpu().numpy()
            ids     = (results.boxes.id.cpu().numpy().astype(int)
                       if results.boxes.id is not None else None)

            for i, (box, cls, conf) in enumerate(zip(boxes, classes, confs)):
                x1, y1, x2, y2 = box
                cx = int((x1+x2)/2)
                cy = int((y1+y2)/2)

                if cls == 2:   # ball
                    ball_interp.record(frame_idx, (cx, cy))
                    tracks.append({'cls': 2, 'tid': -1,
                                   'x1':x1,'y1':y1,'x2':x2,'y2':y2,
                                   'cx':cx,'cy':cy,'conf':float(conf)})
                    continue

                # Player/referee tracks need tracker IDs; skip if ID not available
                if ids is None:
                    continue
                tid = int(ids[i])

                if cls == 0:
                    player_boxes.append((x1, y1, x2, y2))

                if not team_clf.calibrated and len(player_boxes) >= 8:
                    team_clf.calibrate(frame, player_boxes)

                team = team_clf.classify(frame, int(tid), x1, y1, x2, y2)
                speed_est.update(int(tid), cx, cy)

                tracks.append({'cls': int(cls), 'tid': int(tid),
                                'x1':x1,'y1':y1,'x2':x2,'y2':y2,
                                'cx':cx,'cy':cy,'conf':float(conf),
                                'team':team})

        frame_data[frame_idx] = tracks
        frame_idx += 1

        if frame_idx % 100 == 0:
            print(f'  Pass 1: {frame_idx}/{total}')

    cap.release()

    # interpolate ball gaps with Pandas
    print('  Interpolating ball positions with Pandas ...')
    ball_interp.interpolate()

    # ════════════════════════════════════════════════════════════════════════
    # PASS 2 — render annotated video
    # ════════════════════════════════════════════════════════════════════════
    print('\nPass 2/2 — rendering annotated video ...')

    cap = cv2.VideoCapture(str(video_path))
    writer = create_compatible_video_writer(output_video, fps, (width, height))

    poss        = PossessionTracker(
                      proximity_px=P.get('ball_proximity_px', 100),
                      inertia_frames=P.get('inertia_frames', 5),
                  )
    heatmap_a_g = HeatmapGenerator(width, height)
    heatmap_b_g = HeatmapGenerator(width, height)

    player_trails     = defaultdict(lambda: deque(maxlen=15))
    unique_ids        = set()
    frame_idx         = 0
    last_ball_draw    = None
    hold_missed_frames = 0
    max_ball_hold_frames = 15

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        tracks = frame_data.get(frame_idx, [])

        # ── ball position (interpolated, no delay) ────────────────────────
        ball_pos      = ball_interp.get(frame_idx)
        ball_detected = ball_interp.was_detected(frame_idx)

        # ── build player track list ───────────────────────────────────────
        active_player_tracks = []
        for t in tracks:
            if t['cls'] in (0, 1):
                team = t.get('team', -1)
                tid  = t['tid']
                unique_ids.add(tid)
                cx, cy = t['cx'], t['cy']
                player_trails[tid].append((cx, cy))

                speed = speed_est.get_speed_kmh(tid)

                active_player_tracks.append({
                    'track_id': tid,
                    'x_centre': cx,
                    'y_centre': cy,
                    'team':     team,
                })

                if t['cls'] == 0:   # player
                    # draw trail first (behind ellipse)
                    trail_pts = list(player_trails[tid])
                    color     = TEAM_COLORS.get(team, TEAM_COLORS[-1])
                    draw_player_trail(frame, trail_pts, color)

                    t_lbl = 'A' if team==0 else 'B' if team==1 else '?'
                    draw_player_box(
                        frame,
                        t['x1'], t['y1'], t['x2'], t['y2'],
                        color, tid, t_lbl, t['conf'],
                        speed_kmh=speed
                    )

                    if team == 0: heatmap_a_g.update(cx, cy)
                    elif team==1: heatmap_b_g.update(cx, cy)

                else:               # referee
                    draw_player_box(
                        frame,
                        t['x1'], t['y1'], t['x2'], t['y2'],
                        TEAM_COLORS[-1], tid, 'R', t['conf'],
                    )

        # ── draw ball pointer ─────────────────────────────────────────────
        draw_ball_pos = ball_pos
        draw_ball_detected = ball_detected
        if ball_pos is not None:
            last_ball_draw = ball_pos
            hold_missed_frames = 0
        elif last_ball_draw is not None and hold_missed_frames < max_ball_hold_frames:
            draw_ball_pos = last_ball_draw
            draw_ball_detected = False
            hold_missed_frames += 1
        else:
            last_ball_draw = None

        bx = draw_ball_pos[0] if draw_ball_pos else None
        by = draw_ball_pos[1] if draw_ball_pos else None
        draw_ball_pointer(frame, bx, by, draw_ball_detected)

        # ── possession ────────────────────────────────────────────────────
        # Use interpolated ball trajectory so possession can still evolve
        # through short detector dropouts.
        poss.update(ball_pos, active_player_tracks)
        stats        = poss.get_stats()
        current_poss = poss.current_team

        # ── HUD ───────────────────────────────────────────────────────────
        draw_possession_hud(frame, stats, width, current_poss)

        cv2.putText(frame, f'{frame_idx}/{total}',
                    (width-115, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200,200,200), 1)

        writer.write(frame)
        frame_idx += 1

        if frame_idx % 100 == 0:
            print(f'  Pass 2: {frame_idx:4d}/{total} | '
                  f'A={stats["team_a"]:5.1f}%  B={stats["team_b"]:5.1f}%')

    cap.release()
    writer.release()

    heatmap_a_g.render(heatmap_a, 'Team A — Position Heatmap')
    heatmap_b_g.render(heatmap_b, 'Team B — Position Heatmap')

    final_stats = {
        'total_frames':   frame_idx,
        'unique_players': len(unique_ids),
        'possession':     poss.get_stats(),
        'output_video':   str(output_video),
        'heatmap_team_a': str(heatmap_a),
        'heatmap_team_b': str(heatmap_b),
    }

    with open(stats_json, 'w', encoding='utf-8') as f:
        json.dump(final_stats, f, indent=2)

    s = final_stats['possession']
    print()
    print('=' * 55)
    print('PIPELINE COMPLETE')
    print('=' * 55)
    print(f'Frames processed : {frame_idx}')
    print(f'Unique players   : {len(unique_ids)}')
    print(f'Possession A     : {s["team_a"]}%')
    print(f'Possession B     : {s["team_b"]}%')
    print(f'A + B            : {s["team_a"] + s["team_b"]}%  (should be 100%)')
    print(f'Output video     : {output_video}')
    print('=' * 55)

    return final_stats


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('video', nargs='?',
                        default=str(ROOT.parent / 'test_clip.mp4'))
    parser.add_argument('-o', '--output-dir', default='outputs')
    args = parser.parse_args()
    run_pipeline(args.video, args.output_dir)
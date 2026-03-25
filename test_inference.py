import cv2
from ultralytics import YOLO
import time
from pathlib import Path
import argparse
import sys

ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / 'models' / 'best_overall.pt'

COLORS = {0: (0,255,0), 1: (0,255,255), 2: (0,0,255)}
NAMES  = {0: 'player',  1: 'referee',   2: 'ball'}


def parse_args():
    parser = argparse.ArgumentParser(
        description='Run inference on a video using the trained YOLO model.'
    )
    parser.add_argument(
        'video',
        nargs='?',
        default=str(ROOT_DIR.parent / 'test_clip1.mp4'),
        help='Input video path (default: ../test_clip1.mp4)'
    )
    parser.add_argument(
        '-o',
        '--output',
        default=None,
        help='Output video path (default: outputs/<input_name>_detected.mp4)'
    )
    return parser.parse_args()


def resolve_output_path(video_path: Path, output_arg: str | None) -> Path:
    if output_arg:
        return Path(output_arg).expanduser().resolve()

    out_dir = ROOT_DIR / 'outputs'
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir / f'{video_path.stem}_detected.mp4'


def main():
    args = parse_args()
    video_path = Path(args.video).expanduser().resolve()
    output_path = resolve_output_path(video_path, args.output)

    if not MODEL_PATH.exists():
        print(f'ERROR: Model file not found at {MODEL_PATH}')
        sys.exit(1)

    if not video_path.exists():
        print(f'ERROR: Input video not found at {video_path}')
        sys.exit(1)

    # load model
    print('Loading model...')
    model = YOLO(str(MODEL_PATH))
    print('Model loaded')
    print(f'Input video : {video_path}')
    print(f'Output video: {output_path}')

    # open video
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f'ERROR: Cannot open video at {video_path}')
        print('Check the path exists and the file is a valid video')
        sys.exit(1)

    fps    = int(cap.get(cv2.CAP_PROP_FPS))
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f'Video: {width}x{height} @ {fps}fps, {total} frames')

    if total == 0:
        print('ERROR: Video has 0 frames - file may be corrupted or wrong format')
        sys.exit(1)

    # output writer
    writer = cv2.VideoWriter(
        str(output_path),
        cv2.VideoWriter_fourcc(*'mp4v'),
        fps, (width, height)
    )

    frame_count = 0
    start_time  = time.time()

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        results = model(frame, verbose=False, conf=0.3)[0]

        for box in results.boxes:
            cls  = int(box.cls[0])
            conf = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            color = COLORS.get(cls, (255,255,255))
            label = f'{NAMES.get(cls, "?")} {conf:.2f}'
            cv2.rectangle(frame, (x1,y1), (x2,y2), color, 2)
            cv2.putText(frame, label, (x1, y1-6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        writer.write(frame)
        frame_count += 1

        if frame_count % 25 == 0:
            elapsed    = time.time() - start_time
            fps_actual = frame_count / elapsed
            print(f'Frame {frame_count}/{total} | '
                  f'{fps_actual:.1f} fps | '
                  f'{len(results.boxes)} detections')

    cap.release()
    writer.release()

    elapsed = time.time() - start_time
    print(f'\nDone - {frame_count} frames in {elapsed:.1f}s')
    print(f'Output saved to: {output_path}')


if __name__ == '__main__':
    main()

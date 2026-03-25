import os
import sys
import subprocess
from pathlib import Path

from celery import shared_task
from django.utils import timezone

# add project root to path so we can import src/track.py
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))


def ensure_web_playable_video(video_path: str) -> str:
    """Transcode output to browser-friendly H.264 MP4 when possible."""
    input_path = Path(video_path)
    if not input_path.exists():
        return video_path

    try:
        import imageio_ffmpeg
    except Exception:
        return video_path

    output_path = input_path.with_name(f'{input_path.stem}_web.mp4')
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_exe,
        '-y',
        '-i',
        str(input_path),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-an',
        str(output_path),
    ]

    try:
        proc = subprocess.run(cmd, check=False, capture_output=True, text=True)
        if proc.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
            return str(output_path)
    except Exception:
        return video_path

    return video_path


@shared_task(bind=True)
def run_analysis(self, job_id: str):
    from jobs.models import AnalysisJob
    from src.track import run_pipeline

    job = AnalysisJob.objects.get(id=job_id)
    try:
        job.status = 'processing'
        job.started_at = timezone.now()
        job.save(update_fields=['status', 'started_at'])

        output_dir = os.path.join('outputs', job_id)
        result = run_pipeline(video_path=job.video_path, output_dir=output_dir)

        result['output_video'] = ensure_web_playable_video(result['output_video'])

        job.status = 'completed'
        job.completed_at = timezone.now()
        job.output_video = result['output_video']
        job.heatmap_team_a = result['heatmap_team_a']
        job.heatmap_team_b = result['heatmap_team_b']
        job.stats = result.get('possession', {})
        job.save()

        return {'status': 'completed', 'job_id': job_id}

    except Exception as e:
        job.status = 'failed'
        job.error_message = str(e)
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'error_message', 'completed_at'])
        raise

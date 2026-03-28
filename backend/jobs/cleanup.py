"""Remove uploaded video and output artifacts for an analysis job."""
import os
import shutil
from pathlib import Path

from django.conf import settings


def delete_job_files(job) -> None:
    raw_out = os.getenv('OUTPUT_DIR', 'outputs')
    output_root = Path(raw_out) if Path(raw_out).is_absolute() else Path(settings.BASE_DIR) / raw_out
    out_dir = output_root / str(job.id)
    if out_dir.is_dir():
        shutil.rmtree(out_dir, ignore_errors=True)

    vp = Path(job.video_path) if job.video_path else None
    if vp and vp.is_file():
        try:
            vp.unlink()
        except OSError:
            pass

import os
import sys
import uuid
from pathlib import Path

import aiofiles
import django
from asgiref.sync import sync_to_async
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from kombu.exceptions import OperationalError

load_dotenv(Path(__file__).resolve().parent.parent.parent / '.env')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_auth.settings')
django.setup()

from fastapi_ml.auth_utils import get_current_user
from celery_app import app as celery_app  # ensure shared tasks use configured Celery app
from jobs.models import AnalysisJob
from jobs.tasks import run_analysis

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

def _resolve_project_path(path_str: str) -> Path:
    path = Path(path_str).expanduser()
    if path.is_absolute():
        return path
    return (PROJECT_ROOT / path).resolve()


UPLOAD_DIR = _resolve_project_path(os.getenv('UPLOAD_DIR', 'uploads'))
OUTPUT_DIR = _resolve_project_path(os.getenv('OUTPUT_DIR', 'outputs'))
MAX_SIZE = int(os.getenv('MAX_VIDEO_SIZE_MB', 500)) * 1024 * 1024

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title='Football Analytics ML API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.mount('/outputs', StaticFiles(directory=str(OUTPUT_DIR)), name='outputs')


@app.get('/health')
async def health():
    return {'status': 'ok', 'service': 'football-analytics-ml'}


@app.get('/api/ml/health')
async def health_api():
    return {'status': 'ok', 'service': 'football-analytics-ml'}


@app.post('/api/ml/analyze')
async def analyze_video(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
        raise HTTPException(400, 'Only mp4, avi, mov, mkv files accepted')

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, f'File too large. Max {MAX_SIZE // 1024 // 1024}MB')

    job_id = str(uuid.uuid4())
    video_ext = Path(file.filename).suffix
    video_path = UPLOAD_DIR / f'{job_id}{video_ext}'

    async with aiofiles.open(video_path, 'wb') as f:
        await f.write(content)

    job = await sync_to_async(AnalysisJob.objects.create)(
        id=job_id,
        user=current_user,
        status='queued',
        video_filename=file.filename,
        video_path=str(video_path),
    )

    try:
        run_analysis.delay(str(job.id))
    except OperationalError as exc:
        job.status = 'failed'
        job.error_message = f'Queue unavailable: {exc}'
        await sync_to_async(job.save)(update_fields=['status', 'error_message'])
        raise HTTPException(503, 'Analysis queue is unavailable. Start Redis/Celery and try again.')

    return {
        'job_id': str(job.id),
        'status': 'queued',
        'message': 'Video uploaded. Use /api/ml/jobs/{job_id} to poll status.',
    }


@app.get('/api/ml/jobs/{job_id}')
async def get_job(job_id: str, current_user=Depends(get_current_user)):
    try:
        job = await sync_to_async(AnalysisJob.objects.get)(id=job_id, user=current_user)
    except AnalysisJob.DoesNotExist:
        raise HTTPException(404, 'Job not found')

    response = {
        'job_id': str(job.id),
        'status': job.status,
        'filename': job.video_filename,
        'created_at': job.created_at.isoformat(),
        'error': job.error_message or None,
    }

    if job.status == 'completed':
        response['results'] = {
            'stats': job.stats,
            'output_video': f'/outputs/{job_id}/{Path(job.output_video).name}',
            'heatmap_team_a': f'/outputs/{job_id}/{Path(job.heatmap_team_a).name}',
            'heatmap_team_b': f'/outputs/{job_id}/{Path(job.heatmap_team_b).name}',
        }

    return response

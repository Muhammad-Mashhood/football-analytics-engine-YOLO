from django.conf import settings
from django.db import models
import uuid


class AnalysisJob(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='jobs')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    video_filename = models.CharField(max_length=255)
    video_path = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    output_video = models.CharField(max_length=500, blank=True)
    heatmap_team_a = models.CharField(max_length=500, blank=True)
    heatmap_team_b = models.CharField(max_length=500, blank=True)
    stats = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'analysis_jobs'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} - {self.status} - {self.created_at:%Y-%m-%d}'

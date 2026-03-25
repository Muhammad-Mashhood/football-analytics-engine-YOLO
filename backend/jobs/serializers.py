from rest_framework import serializers
from .models import AnalysisJob


class AnalysisJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisJob
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'started_at', 'completed_at']

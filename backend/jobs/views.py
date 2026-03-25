from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import AnalysisJob
from .serializers import AnalysisJobSerializer


class JobListView(generics.ListAPIView):
    serializer_class = AnalysisJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalysisJob.objects.filter(user=self.request.user)


class JobDetailView(generics.RetrieveAPIView):
    serializer_class = AnalysisJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalysisJob.objects.filter(user=self.request.user)

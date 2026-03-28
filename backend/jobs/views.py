from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .cleanup import delete_job_files
from .models import AnalysisJob
from .serializers import AnalysisJobSerializer


class JobListView(generics.ListAPIView):
    serializer_class = AnalysisJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalysisJob.objects.filter(user=self.request.user)


class JobDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = AnalysisJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalysisJob.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == 'processing':
            return Response(
                {'detail': 'Cannot delete while the video is still processing.'},
                status=status.HTTP_409_CONFLICT,
            )
        delete_job_files(instance)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

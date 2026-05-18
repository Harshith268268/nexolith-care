from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Alert
from .serializers import AlertSerializer

class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return alerts for members belonging to the current user's family
        return Alert.objects.filter(member__family__user=self.request.user).order_by('date')

    @action(detail=True, methods=['put'])
    def read(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'History'
        alert.save()
        return Response({'status': 'alert marked as read'})

    @action(detail=True, methods=['put'])
    def reschedule(self, request, pk=None):
        alert = self.get_object()
        new_date = request.data.get('date')
        if new_date:
            alert.date = new_date
            alert.save()
            return Response({'status': 'alert rescheduled', 'date': alert.date})
        return Response({'error': 'date not provided'}, status=400)

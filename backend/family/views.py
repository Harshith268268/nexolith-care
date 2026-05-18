import logging
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Family, FamilyMember
from .serializers import FamilySerializer, FamilyMemberSerializer

logger = logging.getLogger(__name__)

class FamilyViewSet(viewsets.ModelViewSet):
    serializer_class = FamilySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Family.objects.filter(user=self.request.user)

class FamilyMemberViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return members belonging to the current user's family
        return FamilyMember.objects.filter(family__user=self.request.user)

    def perform_create(self, serializer):
        family, _ = Family.objects.get_or_create(user=self.request.user)
        serializer.save(family=family)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)  # Support partial updates safely
        instance = self.get_object()
        
        logger.info(f"PATCH/PUT request to family member {instance.id}. Payload: {request.data}")
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            logger.error(f"Validation failed for family member {instance.id}: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        self.perform_update(serializer)
        logger.info(f"Successfully updated family member {instance.id}.")
        return Response(serializer.data)

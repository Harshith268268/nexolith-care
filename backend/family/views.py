import os
import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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

    @action(detail=True, methods=['post', 'delete', 'patch'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def photo(self, request, pk=None):
        member = self.get_object()  # Ownership automatically verified by get_queryset
        
        if request.method in ['POST', 'PATCH']:
            file_obj = request.FILES.get('profile_image') or request.FILES.get('photo') or request.FILES.get('file')
            
            # Check if request signals removal of profile_image
            if not file_obj and ('profile_image' in request.data and not request.data['profile_image']):
                if member.profile_image:
                    member.profile_image.delete(save=False)
                    member.profile_image = None
                member.avatar_url = None
                member.save()
                serializer = self.get_serializer(member, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)

            if not file_obj:
                return Response({'error': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)

            # Validate File Size (5 MB Limit)
            if file_obj.size > 5 * 1024 * 1024:
                return Response({'error': 'Profile photo must be 5 MB or smaller.'}, status=status.HTTP_400_BAD_REQUEST)

            # Validate File Format
            ext = os.path.splitext(file_obj.name)[1].lower()
            valid_exts = ['.jpg', '.jpeg', '.png', '.webp']
            if ext not in valid_exts:
                return Response({'error': 'Unsupported image format. Please upload JPG, JPEG, PNG, or WEBP.'}, status=status.HTTP_400_BAD_REQUEST)

            # Save uploaded image file
            if member.profile_image:
                member.profile_image.delete(save=False)

            member.profile_image = file_obj
            member.avatar_url = None
            member.save()
            serializer = self.get_serializer(member, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method == 'DELETE':
            if member.profile_image:
                member.profile_image.delete(save=False)
                member.profile_image = None
            member.avatar_url = None
            member.save()
            serializer = self.get_serializer(member, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)


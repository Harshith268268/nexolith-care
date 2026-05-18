from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FamilyViewSet, FamilyMemberViewSet

router = DefaultRouter()
router.register(r'families', FamilyViewSet, basename='family')
router.register(r'members', FamilyMemberViewSet, basename='member')

urlpatterns = [
    path('', include(router.urls)),
]

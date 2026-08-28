from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, NearbyCareView

router = DefaultRouter()
router.register(r'', AlertViewSet, basename='alert')

urlpatterns = [
    path('nearby_care/', NearbyCareView.as_view(), name='nearby_care'),
    path('', include(router.urls)),
]

from django.urls import path
from .views import RegisterView
from .profile_views import ProfileDetailView, ProfilePhotoUploadView
from .security_views import ChangePasswordView, LogoutAllView, ExportUserDataView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileDetailView.as_view(), name='profile-detail'),
    path('profile/photo/', ProfilePhotoUploadView.as_view(), name='profile-photo-upload'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('logout-all/', LogoutAllView.as_view(), name='logout-all'),
    path('export-data/', ExportUserDataView.as_view(), name='export-data'),
]

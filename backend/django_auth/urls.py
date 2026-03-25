from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenBlacklistView,
)
from accounts.views import RegisterView, MeView, GoogleOAuthView, GitHubOAuthView, EmailTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', RegisterView.as_view()),
    path('api/auth/login/', EmailTokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/logout/', TokenBlacklistView.as_view()),
    path('api/auth/me/', MeView.as_view()),
    path('api/auth/google/', GoogleOAuthView.as_view()),
    path('api/auth/github/', GitHubOAuthView.as_view()),
    path('api/', include('jobs.urls')),
]

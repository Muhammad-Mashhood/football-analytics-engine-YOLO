import os
import requests
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer, EmailTokenObtainPairSerializer

User = get_user_model()


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class GoogleOAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('access_token')
        if not token:
            return Response({'error': 'access_token required'}, status=400)

        r = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {token}'},
            timeout=20,
        )
        if r.status_code != 200:
            return Response({'error': 'Invalid Google token'}, status=400)

        data = r.json()
        email = data.get('email')
        avatar = data.get('picture', '')

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'avatar_url': avatar,
            },
        )
        if not created:
            user.avatar_url = avatar
            user.save(update_fields=['avatar_url'])

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        )


class GitHubOAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'code required'}, status=400)

        r = requests.post(
            'https://github.com/login/oauth/access_token',
            data={
                'client_id': os.getenv('GITHUB_CLIENT_ID'),
                'client_secret': os.getenv('GITHUB_CLIENT_SECRET'),
                'code': code,
            },
            headers={'Accept': 'application/json'},
            timeout=20,
        )
        token_data = r.json()
        gh_token = token_data.get('access_token')
        if not gh_token:
            return Response({'error': 'GitHub OAuth failed'}, status=400)

        headers = {
            'Authorization': f'token {gh_token}',
            'Accept': 'application/vnd.github.v3+json',
        }
        user_r = requests.get('https://api.github.com/user', headers=headers, timeout=20)
        email_r = requests.get('https://api.github.com/user/emails', headers=headers, timeout=20)

        gh_user = user_r.json()
        emails = email_r.json() if isinstance(email_r.json(), list) else []
        primary = next((e['email'] for e in emails if e.get('primary')), None)
        email = primary or gh_user.get('email') or f"{gh_user['login']}@github.local"
        avatar = gh_user.get('avatar_url', '')

        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                'username': gh_user.get('login', email.split('@')[0]),
                'avatar_url': avatar,
            },
        )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        )

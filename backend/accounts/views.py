import os
import secrets
import requests
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer, EmailTokenObtainPairSerializer

User = get_user_model()


def _unique_username(base: str) -> str:
    candidate = (base or 'user').strip()[:30] or 'user'
    if not User.objects.filter(username=candidate).exists():
        return candidate

    suffix = 1
    while True:
        tail = str(suffix)
        trial = f"{candidate[: max(1, 30 - len(tail))]}{tail}"
        if not User.objects.filter(username=trial).exists():
            return trial
        suffix += 1


def _random_password() -> str:
    """Generate a secure random password."""
    return secrets.token_urlsafe(32)


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'status': 'ok'})


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
        code = request.data.get('code')

        if not token and not code:
            return Response({'error': 'access_token or code required'}, status=400)

        if code and not token:
            redirect_uri = request.data.get('redirect_uri') or os.getenv('GOOGLE_REDIRECT_URI')
            if not redirect_uri:
                return Response({'error': 'redirect_uri required for Google code exchange'}, status=400)

            token_resp = requests.post(
                'https://oauth2.googleapis.com/token',
                data={
                    'code': code,
                    'client_id': os.getenv('GOOGLE_CLIENT_ID'),
                    'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
                    'redirect_uri': redirect_uri,
                    'grant_type': 'authorization_code',
                },
                timeout=20,
            )
            token_json = token_resp.json() if token_resp.content else {}
            token = token_json.get('access_token')
            if not token:
                return Response({'error': 'Google token exchange failed'}, status=400)

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
        if not email:
            return Response({'error': 'Google account email not available'}, status=400)

        user = User.objects.filter(email=email).first()
        created = user is None
        if created:
            try:
                user = User.objects.create_user(
                    email=email,
                    username=_unique_username(email.split('@')[0]),
                    avatar_url=avatar,
                    password=_random_password(),
                )
            except IntegrityError:
                return Response({'error': 'Could not create user from Google profile'}, status=400)

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

        redirect_uri = request.data.get('redirect_uri') or os.getenv('GITHUB_REDIRECT_URI')

        r = requests.post(
            'https://github.com/login/oauth/access_token',
            data={
                'client_id': os.getenv('GITHUB_CLIENT_ID'),
                'client_secret': os.getenv('GITHUB_CLIENT_SECRET'),
                'code': code,
                'redirect_uri': redirect_uri,
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
        gh_login = gh_user.get('login') or ''
        gh_id = gh_user.get('id')
        fallback_local = gh_login or (f'github_{gh_id}' if gh_id else 'github_user')
        email = primary or gh_user.get('email') or f"{fallback_local}@github.local"
        avatar = gh_user.get('avatar_url', '')

        user = User.objects.filter(email=email).first()
        if user is None:
            try:
                user = User.objects.create_user(
                    email=email,
                    username=_unique_username(gh_login or email.split('@')[0]),
                    avatar_url=avatar,
                    password=_random_password(),
                )
            except IntegrityError:
                return Response({'error': 'Could not create user from GitHub profile'}, status=400)
        else:
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

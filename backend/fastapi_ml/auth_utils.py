from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken, UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

bearer = HTTPBearer()
User = get_user_model()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    token = credentials.credentials
    try:
        UntypedToken(token)
    except (InvalidToken, TokenError) as e:
        raise HTTPException(401, f'Invalid token: {e}')

    decoded = AccessToken(token)
    user_id = decoded['user_id']

    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise HTTPException(401, 'User not found')

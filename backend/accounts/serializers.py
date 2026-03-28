from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password2']

    def validate_email(self, value):
        email = (value or '').strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        return data

    def validate_username(self, value):
        username = (value or '').strip()
        if username and User.objects.filter(username=username).exists():
            raise serializers.ValidationError('This username is already taken')
        return username

    def create(self, validated_data):
        validated_data.pop('password2')
        username = (validated_data.get('username') or '').strip()
        if not username:
            base_username = validated_data['email'].split('@')[0][:30] or 'user'
            username = base_username
            suffix = 1
            while User.objects.filter(username=username).exists():
                tail = str(suffix)
                username = f"{base_username[: max(1, 30 - len(tail))]}{tail}"
                suffix += 1
            validated_data['username'] = username
        try:
            return User.objects.create_user(**validated_data)
        except IntegrityError:
            # Race on email/username unique constraints
            if User.objects.filter(email__iexact=validated_data.get('email', '')).exists():
                raise serializers.ValidationError({'email': 'A user with this email already exists.'})
            raise serializers.ValidationError({'username': 'This username is already taken'})


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'avatar_url', 'bio', 'created_at']
        read_only_fields = ['id', 'created_at']


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

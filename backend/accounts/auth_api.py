import re
import logging

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from django.conf import settings

from accounts.helpers import (
    active_service_keys,
    effective_role,
    is_active_service_key,
    is_provider_role,
    user_base_payload,
)
from .email_service import EmailNotConfiguredError, send_verification_otp_email
from .models import User
from .otp_utils import (
    OTP_EXPIRY_MINUTES,
    can_resend_otp,
    create_or_replace_email_otp,
    verify_email_otp,
)

logger = logging.getLogger(__name__)


def _email_send_failure_response(exc):
    if isinstance(exc, EmailNotConfiguredError):
        message = str(exc)
        code = 'EMAIL_NOT_CONFIGURED'
    else:
        message = (
            'We could not send the verification email. '
            'Please try again in a few minutes.'
        )
        code = 'EMAIL_SEND_FAILED'

    if settings.DEBUG:
        message = f'{message} ({exc})'

    return Response(
        {
            'success': False,
            'message': message,
            'code': code,
        },
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


def _split_name(name):
    parts = (name or '').strip().split(None, 1)
    if not parts:
        return '', ''
    if len(parts) == 1:
        return parts[0], ''
    return parts[0], parts[1]


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    name = (request.data.get('name') or '').strip()
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password')
    confirm_password = request.data.get('confirm_password')
    role = (request.data.get('role') or 'customer').strip()

    if not name:
        return Response(
            {'success': False, 'message': 'Name is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not email:
        return Response(
            {'success': False, 'message': 'Email is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not password:
        return Response(
            {'success': False, 'message': 'Password is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if password != confirm_password:
        return Response(
            {'success': False, 'message': 'Password and confirm password do not match.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if User.objects.filter(email=email).exists():
        return Response(
            {'success': False, 'message': 'An account already exists with this email.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if role != 'customer' and not is_active_service_key(role):
        return Response(
            {'success': False, 'message': 'Invalid or inactive service type.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password(password)
    except ValidationError as exc:
        return Response(
            {'success': False, 'message': ' '.join(exc.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    first_name, last_name = _split_name(name)

    try:
        with transaction.atomic():
            user = User(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=role,
                is_email_verified=False,
                is_verified=False,
                is_active=True,
                is_approved=role == 'customer',
            )
            user.set_password(password)
            user.save()

            otp, _ = create_or_replace_email_otp(user)
            send_verification_otp_email(user, otp)
    except (EmailNotConfiguredError, Exception) as exc:
        return _email_send_failure_response(exc)

    return Response(
        {
            'success': True,
            'message': (
                'Registration successful. A verification OTP has been sent to your email.'
            ),
            'data': {
                'user_id': user.id,
                'name': name,
                'email': user.email,
                'role': user.role,
                'is_email_verified': False,
                'is_approved': user.is_approved,
                'next_step': 'verify_email',
            },
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    email = (request.data.get('email') or '').strip().lower()
    otp = (request.data.get('otp') or '').strip()

    if not re.fullmatch(r'\d{6}', otp or ''):
        return Response(
            {'otp': ['OTP must contain exactly six digits.']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.filter(email=email).first()
    if not user:
        return Response(
            {'success': False, 'message': 'No verification OTP was found. Please request a new OTP.', 'code': 'OTP_NOT_FOUND'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result, remaining = verify_email_otp(user, otp)
    if result == 'OTP_NOT_FOUND':
        return Response(
            {'success': False, 'message': 'No verification OTP was found. Please request a new OTP.', 'code': 'OTP_NOT_FOUND'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if result == 'OTP_EXPIRED':
        return Response(
            {'success': False, 'message': 'OTP has expired. Please request a new OTP.', 'code': 'OTP_EXPIRED'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if result == 'OTP_ATTEMPTS_EXCEEDED':
        return Response(
            {'success': False, 'message': 'Maximum verification attempts reached. Please request a new OTP.', 'code': 'OTP_ATTEMPTS_EXCEEDED'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    if result == 'INVALID_OTP':
        return Response(
            {
                'success': False,
                'message': 'Invalid OTP.',
                'code': 'INVALID_OTP',
                'attempts_remaining': remaining,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.is_email_verified = True
    user.save(update_fields=['is_email_verified'])

    if is_provider_role(user.role):
        message = (
            'Email verified successfully. Your provider account is waiting for admin approval.'
        )
        next_step = 'wait_for_admin_approval'
    else:
        message = 'Email verified successfully. You can now log in.'
        next_step = 'login'

    return Response(
        {
            'success': True,
            'message': message,
            'data': {
                'user_id': user.id,
                'email': user.email,
                'role': user.role,
                'is_email_verified': True,
                'is_approved': user.is_approved,
                'next_step': next_step,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_email_otp(request):
    email = (request.data.get('email') or '').strip().lower()
    user = User.objects.filter(email=email).first()
    if not user:
        return Response(
            {'success': False, 'message': 'No account exists with this email.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if user.is_email_verified:
        return Response(
            {'success': True, 'message': 'Email is already verified.'},
            status=status.HTTP_200_OK,
        )

    allowed, retry_after = can_resend_otp(user)
    if not allowed and retry_after > 0:
        return Response(
            {
                'success': False,
                'message': 'Please wait before requesting another OTP.',
                'code': 'OTP_RESEND_TOO_SOON',
                'retry_after_seconds': retry_after,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    if not allowed:
        return Response(
            {
                'success': False,
                'message': 'Maximum OTP resend limit reached.',
                'code': 'OTP_RESEND_LIMIT_REACHED',
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    otp, _ = create_or_replace_email_otp(user)
    try:
        send_verification_otp_email(user, otp)
    except (EmailNotConfiguredError, Exception) as exc:
        return _email_send_failure_response(exc)

    return Response(
        {
            'success': True,
            'message': 'A new verification OTP has been sent.',
            'data': {
                'email': user.email,
                'otp_expires_in_minutes': OTP_EXPIRY_MINUTES,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login_api(request):
    from django.contrib.auth import login as django_login
    from rest_framework.authtoken.models import Token

    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password')

    if not email or not password:
        return Response(
            {
                'success': False,
                'message': 'Email and password are required.',
                'code': 'EMAIL_PASSWORD_REQUIRED',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {
                'success': False,
                'message': 'Invalid email or password.',
                'code': 'INVALID_CREDENTIALS',
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = authenticate(username=user_obj.username, password=password)
    if user is None:
        return Response(
            {
                'success': False,
                'message': 'Invalid email or password.',
                'code': 'INVALID_CREDENTIALS',
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_superuser and not user.is_email_verified:
        return Response(
            {
                'success': False,
                'message': 'Please verify your email before logging in.',
                'code': 'EMAIL_NOT_VERIFIED',
                'data': {'email': user.email, 'next_step': 'verify_email'},
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    role = effective_role(user)
    if is_provider_role(role) and not user.is_approved:
        return Response(
            {
                'success': False,
                'message': 'Your provider account is waiting for admin approval.',
                'code': 'PROVIDER_APPROVAL_PENDING',
                'data': {
                    'email': user.email,
                    'role': role,
                    'is_email_verified': user.is_email_verified,
                    'is_approved': False,
                    'next_step': 'wait_for_admin_approval',
                },
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    token, _ = Token.objects.get_or_create(user=user)
    django_login(request, user)

    redirect_map = {
        'customer': '/customer-dashboard',
        'admin': '/admin-dashboard',
    }
    if is_provider_role(role):
        redirect_url = '/provider-dashboard'
    else:
        redirect_url = redirect_map.get(role, '/dashboard')

    payload = user_base_payload(user, request)
    payload['is_email_verified'] = user.is_email_verified

    return Response(
        {
            'success': True,
            'message': 'Login successful.',
            'token': token.key,
            'user': payload,
            'redirect_url': redirect_url,
        },
        status=status.HTTP_200_OK,
    )

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.conf import settings
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import User


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')

    if not request.user.check_password(old_password or ''):
        return Response(
            {'old_password': ['Current password is incorrect.']},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if new_password != confirm_password:
        return Response(
            {'confirm_password': ['New password and confirm password do not match.']},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if old_password == new_password:
        return Response(
            {'new_password': ['New password must be different from the current password.']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password(new_password, request.user)
    except ValidationError as exc:
        return Response(
            {'new_password': list(exc.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    request.user.set_password(new_password)
    request.user.save(update_fields=['password'])
    return Response(
        {'success': True, 'message': 'Password changed successfully.'},
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = (request.data.get('email') or '').strip().lower()
    user = User.objects.filter(email=email).first()
    if not user:
        return Response(
            {'email': ['No account exists with this email address.']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    try:
        send_mail(
            subject='Reset your Marketplace password',
            message=(
                f'Use the following details to reset your password.\n\n'
                f'UID: {uid}\nToken: {token}\n'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass

    return Response(
        {
            'success': True,
            'message': 'Password reset link has been sent to your email.',
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')

    if new_password != confirm_password:
        return Response(
            {'confirm_password': ['New password and confirm password do not match.']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response(
            {'uid': ['Invalid password reset link.']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not default_token_generator.check_token(user, token):
        return Response(
            {
                'success': False,
                'message': 'Password reset link is invalid or has expired.',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password(new_password, user)
    except ValidationError as exc:
        return Response(
            {'new_password': list(exc.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save(update_fields=['password'])
    return Response(
        {'success': True, 'message': 'Password reset successfully.'},
        status=status.HTTP_200_OK,
    )

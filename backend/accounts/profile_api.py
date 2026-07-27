import re

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.helpers import is_provider_role, media_url
from .profile_utils import profile_completion, profile_payload

ALLOWED_IMAGE_TYPES = {
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _clean_phone(phone):
    if phone is None:
        return None
    phone = str(phone).strip()
    if not phone:
        return ''
    if re.search(r'[A-Za-z]', phone):
        raise ValueError('Phone number must contain only numbers.')
    digits = re.sub(r'\D', '', phone)
    if len(digits) < 10 or len(digits) > 15:
        raise ValueError('Phone number must contain between 10 and 15 digits.')
    return phone


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile_api(request):
    completion = profile_completion(request.user)
    return Response(
        {
            'success': True,
            'message': 'Profile fetched successfully.',
            'data': {
                'profile': profile_payload(request.user, request),
                'profile_completion': completion['percentage'],
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_api(request):
    user = request.user
    errors = {}

    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    phone = request.data.get('phone')
    address = request.data.get('address')
    bio = request.data.get('bio')
    experience_years = request.data.get('experience_years')

    if first_name is not None:
        user.first_name = str(first_name).strip()
    if last_name is not None:
        user.last_name = str(last_name).strip()
    if address is not None:
        user.address = str(address).strip()
    if bio is not None:
        user.bio = str(bio).strip()

    if phone is not None:
        try:
            user.phone = _clean_phone(phone)
        except ValueError as exc:
            errors['phone'] = [str(exc)]

    if experience_years is not None and experience_years != '':
        if not is_provider_role(user.role):
            user.experience_years = None
        else:
            try:
                years = int(experience_years)
                if years > 60:
                    errors['experience_years'] = ['Experience years cannot be greater than 60.']
                else:
                    user.experience_years = years
            except (TypeError, ValueError):
                errors['experience_years'] = ['Experience years must be a number.']

    if errors:
        return Response(
            {
                'success': False,
                'message': 'Profile update failed.',
                'errors': errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.save()
    completion = profile_completion(user)
    return Response(
        {
            'success': True,
            'message': 'Profile updated successfully.',
            'data': {
                'profile': profile_payload(user, request),
                'profile_completion': completion['percentage'],
                'missing_fields': completion['missing_fields'],
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def profile_image_api(request):
    user = request.user

    if request.method == 'DELETE':
        if not user.profile_picture:
            return Response(
                {
                    'success': False,
                    'message': 'Profile image does not exist.',
                    'code': 'PROFILE_IMAGE_NOT_FOUND',
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        user.profile_picture.delete(save=False)
        user.profile_picture = None
        user.save(update_fields=['profile_picture'])
        completion = profile_completion(user)
        return Response(
            {
                'success': True,
                'message': 'Profile image deleted successfully.',
                'data': {
                    'profile_picture': None,
                    'profile_completion': completion['percentage'],
                },
            },
            status=status.HTTP_200_OK,
        )

    image = request.FILES.get('profile_picture')
    if not image:
        return Response(
            {
                'success': False,
                'message': 'Profile image upload failed.',
                'errors': {'profile_picture': ['No image file provided.']},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = getattr(image, 'content_type', '') or ''
    if content_type not in ALLOWED_IMAGE_TYPES:
        return Response(
            {
                'success': False,
                'message': 'Profile image upload failed.',
                'errors': {
                    'profile_picture': ['Only JPG, JPEG, PNG and WEBP images are allowed.'],
                },
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if image.size > MAX_IMAGE_BYTES:
        return Response(
            {
                'success': False,
                'message': 'Profile image upload failed.',
                'errors': {'profile_picture': ['Profile image size cannot exceed 5 MB.']},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.profile_picture = image
    user.save(update_fields=['profile_picture'])
    completion = profile_completion(user)
    return Response(
        {
            'success': True,
            'message': 'Profile image uploaded successfully.',
            'data': {
                'profile_picture': media_url(request, user.profile_picture),
                'profile_completion': completion['percentage'],
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_completion_api(request):
    completion = profile_completion(request.user)
    return Response(
        {
            'success': True,
            'message': 'Profile completion fetched successfully.',
            'data': completion,
        },
        status=status.HTTP_200_OK,
    )

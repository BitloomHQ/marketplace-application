from django.conf import settings
from django.db import ProgrammingError
from django.db.utils import OperationalError

from adminpanel.models import ServiceCategory
from services.models import Review

def provider_role_keys():
    try:
        keys = list(ServiceCategory.objects.values_list("key", flat=True))
        return keys or ["gardener", "electrician", "plumber"]
    except (ProgrammingError, OperationalError):
        return ["gardener", "electrician", "plumber"]


def active_service_keys():
    return list(
        ServiceCategory.objects.filter(status='active').values_list('key', flat=True),
    )


def is_provider_role(role):
    return role in provider_role_keys()


def is_active_service_key(key):
    return key in active_service_keys()


def effective_role(user):
    """
    Return the effective application role.

    Superuser / Staff Admin -> admin
    Provider               -> provider role
    Customer               -> customer
    """

    if user.is_superuser or user.is_staff:
        return "admin"

    return user.role


def normalize_media_url(url: str) -> str:
    """Rewrite Supabase S3 API URLs to browser-loadable public object URLs."""
    public_base = getattr(settings, 'AWS_S3_PUBLIC_BASE_URL', '').rstrip('/')
    if not public_base or '/storage/v1/s3/' not in url:
        return url
    marker = '/storage/v1/s3/'
    tail = url.split(marker, 1)[1]
    parts = tail.split('/', 1)
    if len(parts) == 2:
        return f'{public_base}/{parts[1]}'
    return url


def media_url(request, field):
    if field and hasattr(field, 'url'):
        url = normalize_media_url(field.url)
        if url.startswith('http://') or url.startswith('https://'):
            return url
        if request:
            return request.build_absolute_uri(url)
        return url
    return None


def serialize_address(address):
    return {
        'id': address.id,
        'title': address.title,
        'address': address.address,
        'latitude': address.latitude,
        'longitude': address.longitude,
    }


def provider_rating(user):
    reviews = Review.objects.filter(provider=user)
    if not reviews.exists():
        return 0, 0
    total = sum(review.rating for review in reviews)
    return round(total / reviews.count(), 1), reviews.count()


def serialize_service_category(category, request=None):
    return {
        'id': category.id,
        'name': category.name,
        'key': category.key,
        'status': category.status,
        'description': category.description,
        'service_image': media_url(request, category.service_image) if request else None,
        'start_date': category.start_date or '',
        'display_order': category.display_order,
    }


def dashboard_services():
    return ServiceCategory.objects.filter(
        status__in=['active', 'coming_soon'],
    ).order_by('display_order', 'name')


def user_base_payload(user, request=None):
    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': effective_role(user),
        'phone': user.phone,
        'address': user.address or '',
        'profile_picture': media_url(request, user.profile_picture) if request else None,
        'bio': user.bio or None,
        'experience_years': user.experience_years,
        'is_verified': user.is_verified,
        'is_email_verified': user.is_email_verified,
        'is_approved': user.is_approved,
        'is_active': user.is_active,
        'status_note': user.status_note or '',
        'deactivate_reason': user.deactivate_reason or None,
    }
    return data


def portfolio_payload(user, request):
    return [
        {
            'id': item.id,
            'image': media_url(request, item.image),
            'caption': item.caption,
        }
        for item in user.portfolio_images.all()
    ]


def provider_profile_payload(user, request):
    average_rating, total_reviews = provider_rating(user)
    return {
        'provider_id': user.id,
        'provider': user.username,
        'provider_email': user.email,
        'provider_phone': user.phone,
        'provider_address': user.address or '',
        'provider_role': user.role,
        'is_verified': user.is_verified,
        'provider_profile_picture': media_url(request, user.profile_picture),
        'bio': user.bio or None,
        'experience_years': user.experience_years,
        'portfolio_images': portfolio_payload(user, request),
        'average_rating': average_rating,
        'total_reviews': total_reviews,
    }


def provider_list_payload(user, request):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'phone': user.phone,
        'address': user.address or '',
        'role': user.role,
        'bio': user.bio or None,
        'experience_years': user.experience_years,
        'is_verified': user.is_verified,
        'profile_picture': media_url(request, user.profile_picture),
    }


def provider_access_ok(user):
    if not is_provider_role(user.role):
        return False, 'Only providers'
    if not user.is_approved:
        return False, 'Your provider account is pending admin approval'
    if not user.is_active:
        message = 'Your provider account is deactivated'
        reason = user.deactivate_reason or user.status_note
        if reason:
            message = f'{message}: {reason}'
        return False, message
    return True, None

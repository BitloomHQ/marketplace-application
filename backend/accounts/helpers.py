from services.models import Review
from adminpanel.models import ServiceCategory


def provider_role_keys():
    keys = list(ServiceCategory.objects.values_list('key', flat=True))
    return keys or ['gardener', 'electrician', 'plumber']


def active_service_keys():
    return list(
        ServiceCategory.objects.filter(status='active').values_list('key', flat=True),
    )


def is_provider_role(role):
    return role in provider_role_keys()


def is_active_service_key(key):
    return key in active_service_keys()


def effective_role(user):
    return 'admin' if user.is_superuser else user.role


def media_url(request, field):
    if field and hasattr(field, 'url'):
        return request.build_absolute_uri(field.url)
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
        'is_approved': user.is_approved,
        'is_active': user.is_active,
        'status_note': user.status_note or '',
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
        if user.status_note:
            message = f'{message}: {user.status_note}'
        return False, message
    return True, None

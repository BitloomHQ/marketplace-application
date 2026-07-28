from accounts.helpers import is_provider_role, media_url


def profile_payload(user, request=None):
    full_name = user.get_full_name().strip()
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'full_name': full_name or user.username,
        'role': user.role,
        'phone': user.phone or '',
        'address': user.address or '',
        'profile_picture': media_url(request, user.profile_picture) if user.profile_picture else None,
        'profile_picture_url': media_url(request, user.profile_picture) if request else None,
        'bio': user.bio or '',
        'experience_years': user.experience_years,
        'is_provider': is_provider_role(user.role),
        'is_email_verified': user.is_email_verified,
        'is_verified': user.is_verified,
        'is_approved': user.is_approved,
        'is_active': user.is_active,
        'status_note': user.status_note or '',
        'date_joined': user.date_joined,
    }


def _field_filled(user, field_name):
    if field_name == 'profile_picture':
        return bool(user.profile_picture)
    value = getattr(user, field_name, None)
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def profile_completion(user):
    if is_provider_role(user.role):
        fields = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'address',
            'profile_picture',
            'bio',
            'experience_years',
        ]
    else:
        fields = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'address',
            'profile_picture',
        ]

    completed_fields = [f for f in fields if _field_filled(user, f)]
    missing_fields = [f for f in fields if f not in completed_fields]
    total = len(fields)
    completed_count = len(completed_fields)
    percentage = round((completed_count / total) * 100) if total else 0

    return {
        'percentage': percentage,
        'completed_count': completed_count,
        'total_fields': total,
        'completed_fields': completed_fields,
        'missing_fields': missing_fields,
        'is_complete': completed_count == total,
    }

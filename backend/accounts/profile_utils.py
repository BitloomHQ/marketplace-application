from accounts.helpers import is_provider_role


def calculate_profile_completion(user):

    common_fields = {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "address": user.address,
        "profile_picture": user.profile_picture,
    }

    provider_fields = {
        "bio": user.bio,
        "experience_years": user.experience_years,
    }

    fields = common_fields.copy()

    if is_provider_role(user.role):
        fields.update(provider_fields)

    completed_fields = []
    missing_fields = []

    for field_name, value in fields.items():

        if value not in [
            None,
            "",
        ]:
            completed_fields.append(field_name)
        else:
            missing_fields.append(field_name)

    total_fields = len(fields)
    completed_count = len(completed_fields)

    percentage = 0

    if total_fields:
        percentage = round(
            completed_count / total_fields * 100
        )

    return {
        "percentage": percentage,
        "completed_count": completed_count,
        "total_fields": total_fields,
        "completed_fields": completed_fields,
        "missing_fields": missing_fields,
        "is_complete": percentage == 100,
    }
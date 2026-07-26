from .models import ServiceCategory


def get_active_service_keys():

    return list(
        ServiceCategory.objects.filter(
            status="active"
        ).values_list(
            "key",
            flat=True
        )
    )


def is_active_service(service_key):

    return ServiceCategory.objects.filter(
        key=service_key,
        status="active"
    ).exists()
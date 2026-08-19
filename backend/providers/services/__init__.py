from providers.models import ProviderService
from service_requests.models import CustomerServiceRequest


def find_matching_providers(service_request):
    """
    Find providers who can potentially handle a customer
    service request.

    Current matching rules:
    1. Provider must offer the requested category.
    2. Provider service must be active.
    3. Provider account must be active.
    4. Provider must be approved.
    """

    if not isinstance(
        service_request,
        CustomerServiceRequest,
    ):
        raise ValueError(
            "service_request must be a CustomerServiceRequest instance."
        )

    provider_services = (
        ProviderService.objects
        .filter(
            category=service_request.category,
            is_active=True,
            provider__is_active=True,
            provider__is_approved=True,
        )
        .select_related(
            "provider",
            "category",
        )
    )

    # A provider may theoretically have multiple matching
    # service records, so remove duplicates.
    provider_ids = (
        provider_services
        .values_list(
            "provider_id",
            flat=True,
        )
        .distinct()
    )

    return provider_ids
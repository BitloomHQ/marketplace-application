from decimal import Decimal

from adminpanel.models import MarketplaceLocationSettings


def get_marketplace_location_settings():
    """
    Return the global marketplace location settings.
    """

    return MarketplaceLocationSettings.get_settings()


def get_effective_provider_radius(provider_profile):
    """
    Calculate the actual radius that can be used
    for nearby request matching.

    Effective radius =
        minimum of:
        - admin maximum radius
        - provider preferred radius
    """

    marketplace_settings = (
        get_marketplace_location_settings()
    )

    admin_radius = Decimal(
        str(
            marketplace_settings.max_provider_radius_km
        )
    )

    provider_radius = (
        provider_profile.service_radius_km
    )

    if provider_radius is None:
        provider_radius = Decimal(
            str(
                marketplace_settings
                .default_provider_radius_km
            )
        )

    provider_radius = Decimal(
        str(provider_radius)
    )

    return min(
        admin_radius,
        provider_radius,
    )
from django.db.models import Avg

from service_requests.models import ServiceReview


def recalculate_provider_rating(provider_profile):
    """
    Recalculate and save the provider's average rating
    using all reviews linked to that provider profile.
    """

    result = (
        ServiceReview.objects
        .filter(
            provider_profile=provider_profile
        )
        .aggregate(
            average_rating=Avg("rating")
        )
    )

    average_rating = (
        result["average_rating"]
        or 0
    )

    provider_profile.average_rating = round(
        average_rating,
        2,
    )

    provider_profile.save(
        update_fields=[
            "average_rating",
            "updated_at",
        ]
    )

    return provider_profile.average_rating
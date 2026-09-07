from decimal import Decimal

from django.db.models import Avg, Sum
from django.utils import timezone

from accounts.helpers import media_url

from service_requests.models import (
    ProviderQuotation,
    ServiceBooking,
    ServiceReview,
)


def get_provider_dashboard_payload(
    provider_profile,
    request=None,
):
    """
    Build production-ready dashboard data
    for a marketplace provider.
    """

    provider = provider_profile.provider
    today = timezone.localdate()

    # =========================================================
    # QUOTATIONS
    # =========================================================

    quotations = (
        ProviderQuotation.objects
        .filter(
            provider_profile=provider_profile
        )
        .select_related(
            "service_request",
            "service_request__category",
        )
    )

    total_quotations = quotations.count()

    pending_quotations = (
        quotations
        .filter(status="pending")
        .count()
    )

    accepted_quotations = (
        quotations
        .filter(status="accepted")
        .count()
    )

    rejected_quotations = (
        quotations
        .filter(status="rejected")
        .count()
    )

    withdrawn_quotations = (
        quotations
        .filter(status="withdrawn")
        .count()
    )

    # =========================================================
    # QUOTATION ACCEPTANCE RATE
    # =========================================================

    quotation_acceptance_rate = 0

    if total_quotations > 0:
        quotation_acceptance_rate = round(
            (
                accepted_quotations
                / total_quotations
            )
            * 100,
            2,
        )

    # =========================================================
    # BOOKINGS
    # =========================================================

    bookings = (
        ServiceBooking.objects
        .filter(
            provider_profile=provider_profile
        )
        .select_related(
            "customer",
            "service_request",
            "service_request__category",
            "quotation",
        )
    )

    total_bookings = bookings.count()

    accepted_bookings = (
        bookings
        .filter(status="accepted")
        .count()
    )

    scheduled_bookings = (
        bookings
        .filter(status="scheduled")
        .count()
    )

    in_progress_bookings = (
        bookings
        .filter(status="in_progress")
        .count()
    )

    completed_bookings = (
        bookings
        .filter(status="completed")
        .count()
    )

    cancelled_bookings = (
        bookings
        .filter(status="cancelled")
        .count()
    )

    # =========================================================
    # COMPLETION / CANCELLATION RATE
    # =========================================================

    completion_rate = 0
    cancellation_rate = 0

    if total_bookings > 0:

        completion_rate = round(
            (
                completed_bookings
                / total_bookings
            )
            * 100,
            2,
        )

        cancellation_rate = round(
            (
                cancelled_bookings
                / total_bookings
            )
            * 100,
            2,
        )

    # =========================================================
    # EARNINGS
    # =========================================================

    total_earnings = (
        bookings
        .filter(status="completed")
        .aggregate(
            total=Sum("final_price")
        )["total"]
        or Decimal("0.00")
    )

    current_month = today.month
    current_year = today.year

    this_month_earnings = (
        bookings
        .filter(
            status="completed",
            completed_at__year=current_year,
            completed_at__month=current_month,
        )
        .aggregate(
            total=Sum("final_price")
        )["total"]
        or Decimal("0.00")
    )

    # =========================================================
    # AVERAGE BOOKING VALUE
    # =========================================================

    average_booking_value = Decimal("0.00")

    if completed_bookings > 0:
        average_booking_value = (
            total_earnings
            / completed_bookings
        )

    # =========================================================
    # REVIEWS
    # =========================================================

    reviews = (
        ServiceReview.objects
        .filter(
            provider_profile=provider_profile
        )
    )

    review_stats = reviews.aggregate(
        average=Avg("rating"),
    )

    average_rating = round(
        float(
            review_stats["average"]
            or 0
        ),
        1,
    )

    total_reviews = reviews.count()

    # =========================================================
    # UPCOMING JOB
    # =========================================================

    upcoming_job = (
        bookings
        .filter(
            status__in=[
                "accepted",
                "scheduled",
            ],
            scheduled_date__gte=today,
        )
        .order_by(
            "scheduled_date",
            "scheduled_start_time",
        )
        .first()
    )

    upcoming_job_data = None

    if upcoming_job:

        service_request = (
            upcoming_job.service_request
        )

        customer = (
            upcoming_job.customer
        )

        upcoming_job_data = {
            "booking_id": (
                upcoming_job.id
            ),

            "status": (
                upcoming_job.status
            ),

            "final_price": str(
                upcoming_job.final_price
            ),

            "service": {
                "id": (
                    service_request.category.id
                ),

                "name": (
                    service_request.category.name
                ),

                "key": (
                    service_request.category.key
                ),
            },

            "request": {
                "id": str(
                    service_request.id
                ),

                "title": (
                    service_request.title
                ),

                "urgency": (
                    service_request.urgency
                ),
            },

            "customer": {
                "id": customer.id,

                "full_name": (
                    customer.get_full_name()
                    or customer.username
                ),
            },

            "schedule": {
                "date": (
                    upcoming_job.scheduled_date
                ),

                "start_time": (
                    upcoming_job
                    .scheduled_start_time
                ),

                "end_time": (
                    upcoming_job
                    .scheduled_end_time
                ),
            },

            "location": {
                "address": (
                    service_request
                    .service_address
                ),

                "city": (
                    service_request.city
                ),

                "state": (
                    service_request.state
                ),

                "postal_code": (
                    service_request.postal_code
                ),
            },
        }

    # =========================================================
    # ACTION REQUIRED
    # =========================================================

    accepted_jobs = (
        bookings
        .filter(status="accepted")
        .count()
    )

    active_jobs = (
        bookings
        .filter(status="in_progress")
        .count()
    )

    action_required = {
        "accepted_jobs_to_schedule": (
            accepted_jobs
        ),

        "active_jobs": (
            active_jobs
        ),

        "total": (
            accepted_jobs
            + active_jobs
        ),
    }

    # =========================================================
    # RECENT BOOKINGS
    # =========================================================

    recent_bookings = []

    for booking in (
        bookings
        .order_by("-created_at")[:5]
    ):

        service_request = (
            booking.service_request
        )

        customer = booking.customer

        recent_bookings.append(
            {
                "booking_id": (
                    booking.id
                ),

                "status": (
                    booking.status
                ),

                "final_price": str(
                    booking.final_price
                ),

                "service": {
                    "name": (
                        service_request
                        .category
                        .name
                    ),

                    "key": (
                        service_request
                        .category
                        .key
                    ),
                },

                "customer": {
                    "id": (
                        customer.id
                    ),

                    "full_name": (
                        customer.get_full_name()
                        or customer.username
                    ),
                },

                "created_at": (
                    booking.created_at
                ),
            }
        )

    # =========================================================
    # RECENT REVIEWS
    # =========================================================

    recent_reviews = []

    for review in (
        reviews
        .select_related(
            "customer",
            "booking",
        )
        .order_by("-created_at")[:5]
    ):

        recent_reviews.append(
            {
                "review_id": (
                    review.id
                ),

                "rating": (
                    review.rating
                ),

                "review": (
                    review.review
                ),

                "customer": {
                    "id": (
                        review.customer.id
                    ),

                    "full_name": (
                        review.customer.get_full_name()
                        or review.customer.username
                    ),
                },

                "created_at": (
                    review.created_at
                ),
            }
        )

    # =========================================================
    # PROFILE COMPLETION
    # =========================================================

    profile_checks = [
        bool(provider.first_name),
        bool(provider.last_name),
        bool(provider.email),
        bool(provider.phone),
        bool(provider.profile_picture),
        bool(provider.bio),
        provider.experience_years is not None,
        bool(provider.is_email_verified),
    ]

    completed_profile_fields = sum(
        profile_checks
    )

    profile_completion = round(
        (
            completed_profile_fields
            / len(profile_checks)
        )
        * 100
    )

    # =========================================================
    # PROVIDER ACCOUNT
    # =========================================================

    account = {
        "id": provider.id,

        "username": provider.username,

        "full_name": (
            provider.get_full_name()
            or provider.username
        ),

        "email": provider.email,

        "phone": provider.phone,

        "role": provider.role,

        "profile_picture": (
            media_url(
                request,
                provider.profile_picture,
            )
        ),

        "bio": (
            provider.bio
            or None
        ),

        "experience_years": (
            provider.experience_years
        ),

        "is_verified": (
            provider.is_verified
        ),

        "is_email_verified": (
            provider.is_email_verified
        ),

        "is_approved": (
            provider.is_approved
        ),

        "is_active": (
            provider.is_active
        ),

        "profile_completion": (
            profile_completion
        ),
    }

    # =========================================================
    # RETURN
    # =========================================================

    return {
        "account": account,

        "earnings": {
            "total": str(
                total_earnings
            ),

            "this_month": str(
                this_month_earnings
            ),

            "average_booking_value": str(
                round(
                    average_booking_value,
                    2,
                )
            ),
        },

        "quotation_summary": {
            "total": (
                total_quotations
            ),

            "pending": (
                pending_quotations
            ),

            "accepted": (
                accepted_quotations
            ),

            "rejected": (
                rejected_quotations
            ),

            "withdrawn": (
                withdrawn_quotations
            ),

            "acceptance_rate": (
                quotation_acceptance_rate
            ),
        },

        "booking_summary": {
            "total": (
                total_bookings
            ),

            "accepted": (
                accepted_bookings
            ),

            "scheduled": (
                scheduled_bookings
            ),

            "in_progress": (
                in_progress_bookings
            ),

            "completed": (
                completed_bookings
            ),

            "cancelled": (
                cancelled_bookings
            ),

            "completion_rate": (
                completion_rate
            ),

            "cancellation_rate": (
                cancellation_rate
            ),
        },

        "rating_summary": {
            "average_rating": (
                average_rating
            ),

            "total_reviews": (
                total_reviews
            ),
        },

        "upcoming_job": (
            upcoming_job_data
        ),

        "action_required": (
            action_required
        ),

        "recent_bookings": (
            recent_bookings
        ),

        "recent_reviews": (
            recent_reviews
        ),

        "quick_actions": {
            "has_jobs_to_schedule": (
                accepted_jobs > 0
            ),

            "has_active_jobs": (
                active_jobs > 0
            ),

            "can_receive_work": (
                provider.is_active
                and provider.is_approved
            ),
        },
    }
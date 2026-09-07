from django.db.models import Count, Q
from django.utils import timezone

from accounts.helpers import (
    media_url,
    serialize_address,
)

from accounts.models import (
    CustomerAddress,
    FavoriteProvider,
)

from service_requests.models import (
    CustomerServiceRequest,
    ProviderQuotation,
    ServiceBooking,
)


def get_customer_dashboard_payload(
    user,
    request=None,
):
    """
    Build the complete personalized dashboard
    payload for a customer.
    """

    today = timezone.localdate()

    # =========================================================
    # ADDRESSES
    # =========================================================

    addresses = (
        CustomerAddress.objects
        .filter(customer=user)
        .order_by("-created_at")
    )

    # =========================================================
    # FAVORITES
    # =========================================================

    favorites = (
        FavoriteProvider.objects
        .filter(customer=user)
        .select_related("provider")
        .order_by("-created_at")
    )

    # =========================================================
    # SERVICE REQUESTS
    # =========================================================

    service_requests = (
        CustomerServiceRequest.objects
        .filter(customer=user)
        .select_related("category")
    )

    active_request_statuses = [
        "open",
        "matched",
        "quoted",
        "accepted",
        "in_progress",
    ]

    active_requests = (
        service_requests
        .filter(
            status__in=active_request_statuses
        )
        .order_by("-created_at")
    )

    # =========================================================
    # BOOKINGS
    # =========================================================

    bookings = (
        ServiceBooking.objects
        .filter(customer=user)
        .select_related(
            "service_request",
            "service_request__category",
            "provider_profile",
            "provider_profile__provider",
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
    # UPCOMING BOOKING
    # =========================================================

    upcoming_booking = (
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

    upcoming_booking_data = None

    if upcoming_booking:

        provider = (
            upcoming_booking
            .provider_profile
            .provider
        )

        service_request = (
            upcoming_booking
            .service_request
        )

        upcoming_booking_data = {
            "booking_id": (
                upcoming_booking.id
            ),

            "status": (
                upcoming_booking.status
            ),

            "final_price": str(
                upcoming_booking.final_price
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
            },

            "provider": {
                "id": provider.id,

                "full_name": (
                    provider.get_full_name()
                    or provider.username
                ),

                "profile_picture": (
                    media_url(
                        request,
                        provider.profile_picture,
                    )
                ),

                "is_verified": (
                    provider.is_verified
                ),
            },

            "schedule": {
                "date": (
                    upcoming_booking
                    .scheduled_date
                ),

                "start_time": (
                    upcoming_booking
                    .scheduled_start_time
                ),

                "end_time": (
                    upcoming_booking
                    .scheduled_end_time
                ),
            },
        }

    # =========================================================
    # PENDING QUOTATIONS
    # =========================================================

    pending_quotations = (
        ProviderQuotation.objects
        .filter(
            service_request__customer=user,
            status="pending",
        )
        .select_related(
            "service_request",
            "service_request__category",
            "provider_profile",
            "provider_profile__provider",
        )
        .order_by("-created_at")
    )

    # =========================================================
    # BOOKINGS NEEDING REVIEW
    # =========================================================

    review_required = (
        bookings
        .filter(
            status="completed",
            review__isnull=True,
        )
        .order_by("-completed_at")
    )

    # =========================================================
    # ACTION REQUIRED
    # =========================================================

    action_required = {
        "pending_quotations": (
            pending_quotations.count()
        ),

        "reviews_required": (
            review_required.count()
        ),

        "total": (
            pending_quotations.count()
            + review_required.count()
        ),
    }

    # =========================================================
    # RECENT REQUESTS
    # =========================================================

    recent_requests = []

    for item in (
        service_requests
        .order_by("-created_at")[:5]
    ):

        recent_requests.append(
            {
                "id": str(item.id),

                "title": item.title,

                "status": item.status,

                "urgency": item.urgency,

                "service": {
                    "id": item.category.id,
                    "name": item.category.name,
                    "key": item.category.key,
                },

                "created_at": (
                    item.created_at
                ),
            }
        )

    # =========================================================
    # RECENT BOOKINGS
    # =========================================================

    recent_bookings = []

    for booking in (
        bookings
        .order_by("-created_at")[:5]
    ):

        provider = (
            booking
            .provider_profile
            .provider
        )

        recent_bookings.append(
            {
                "booking_id": booking.id,

                "status": booking.status,

                "final_price": str(
                    booking.final_price
                ),

                "service": (
                    booking
                    .service_request
                    .category
                    .name
                ),

                "provider": (
                    provider.get_full_name()
                    or provider.username
                ),

                "created_at": (
                    booking.created_at
                ),
            }
        )

    # =========================================================
    # FAVORITE PROVIDER PREVIEW
    # =========================================================

    favorite_preview = []

    for favorite in favorites[:4]:

        provider = favorite.provider

        favorite_preview.append(
            {
                "favorite_id": (
                    favorite.id
                ),

                "provider_id": (
                    provider.id
                ),

                "full_name": (
                    provider.get_full_name()
                    or provider.username
                ),

                "role": provider.role,

                "profile_picture": (
                    media_url(
                        request,
                        provider.profile_picture,
                    )
                ),

                "is_verified": (
                    provider.is_verified
                ),

                "saved_at": (
                    favorite.created_at
                ),
            }
        )

    # =========================================================
    # ACCOUNT COMPLETION
    # =========================================================

    profile_checks = [
        bool(user.first_name),
        bool(user.last_name),
        bool(user.email),
        bool(user.phone),
        bool(user.profile_picture),
        addresses.exists(),
        bool(user.is_email_verified),
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
    # RESPONSE
    # =========================================================

    return {
        "account": {
            "id": user.id,

            "username": user.username,

            "full_name": (
                user.get_full_name()
                or user.username
            ),

            "email": user.email,

            "phone": user.phone,

            "profile_picture": (
                media_url(
                    request,
                    user.profile_picture,
                )
            ),

            "is_email_verified": (
                user.is_email_verified
            ),

            "is_active": user.is_active,

            "profile_completion": (
                profile_completion
            ),

            "address_count": (
                addresses.count()
            ),

            "favorite_provider_count": (
                favorites.count()
            ),
        },

        "booking_summary": {
            "total": total_bookings,

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
        },

        "request_summary": {
            "total": (
                service_requests.count()
            ),

            "active": (
                active_requests.count()
            ),

            "open": (
                service_requests
                .filter(status="open")
                .count()
            ),

            "quoted": (
                service_requests
                .filter(status="quoted")
                .count()
            ),

            "completed": (
                service_requests
                .filter(status="completed")
                .count()
            ),

            "cancelled": (
                service_requests
                .filter(status="cancelled")
                .count()
            ),
        },

        "upcoming_booking": (
            upcoming_booking_data
        ),

        "action_required": (
            action_required
        ),

        "recent_requests": (
            recent_requests
        ),

        "recent_bookings": (
            recent_bookings
        ),

        "favorite_providers": (
            favorite_preview
        ),

        "quick_actions": {
            "can_create_request": (
                user.is_active
            ),

            "has_pending_quotations": (
                pending_quotations.exists()
            ),

            "has_reviews_to_submit": (
                review_required.exists()
            ),

            "has_upcoming_booking": (
                upcoming_booking
                is not None
            ),
        },
    }
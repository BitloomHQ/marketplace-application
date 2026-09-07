from time import timezone

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services.notifications import create_notification, notify_matching_providers

from .services.reviews import recalculate_provider_rating

from .models import CustomerServiceRequest, ProviderQuotation, ServiceBooking, ServiceNotification, ServiceReview
from .permissions import IsBookingParticipant, IsCustomerUser, IsProviderUser
from .serializers import CustomerServiceRequestSerializer, ProviderQuotationSerializer, ServiceBookingSerializer, ServiceNotificationSerializer, ServiceReviewSerializer
from django.core.paginator import Paginator
from .helpers import (
    build_request_tracking,
    serialize_customer_booking,
)
from accounts.helpers import media_url
from django.db.models import Avg, Count
@api_view(["GET", "POST"])
@permission_classes([
    IsAuthenticated,
    IsCustomerUser,
])
def customer_service_request_list_create_api(request):

    if request.method == "GET":

        service_requests = (
            CustomerServiceRequest.objects
            .filter(customer=request.user)
            .select_related("category")
            .prefetch_related("images")
            .order_by("-created_at")
        )

        serializer = CustomerServiceRequestSerializer(
            service_requests,
            many=True,
            context={
                "request": request,
            },
        )

        return Response(
            {
                "success": True,
                "message": "Service requests fetched successfully.",
                "count": service_requests.count(),
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    serializer = CustomerServiceRequestSerializer(
        data=request.data,
        context={
            "request": request,
        },
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Service request creation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    service_request = serializer.save(
        customer=request.user,
        status="open",
    )

    matched_providers = find_matching_providers(
        service_request
    )

    notify_matching_providers(
        service_request,
        matched_providers,
    )

    if matched_providers:
        service_request.status = "matched"

        service_request.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

    return Response(
        {
            "success": True,
            "message": "Service request created successfully.",
            "matched_provider_count": len(
                matched_providers
            ),
            "data": CustomerServiceRequestSerializer(
                service_request,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )

from providers.services.matching import find_matching_providers
@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsCustomerUser,
])
def matched_providers_api(request, request_id):
    """
    Return ranked providers for a customer's service request.
    """

    try:
        service_request = (
            CustomerServiceRequest.objects
            .select_related(
                "customer",
                "category",
            )
            .get(
                id=request_id,
                customer=request.user,
            )
        )

    except CustomerServiceRequest.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Service request not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    matches = find_matching_providers(
        service_request
    )

    providers_data = []

    for match in matches:

        provider_profile = match[
            "provider_profile"
        ]

        provider_user = (
            provider_profile.provider
        )

        provider_service = (
            provider_profile.services
            .filter(
                category=service_request.category,
                is_active=True,
            )
            .first()
        )

        providers_data.append(
            {
                "provider_id": provider_user.id,

                "provider_name": (
                    provider_user.get_full_name()
                    or provider_user.username
                ),

                "provider_email": provider_user.email,

                "business_name": (
                    provider_profile.business_name
                ),

                "professional_title": (
                    provider_profile.professional_title
                ),

                "description": (
                    provider_profile.description
                ),

                "total_experience_years": (
                    provider_profile
                    .total_experience_years
                ),

                "accepts_emergency_work": (
                    provider_profile
                    .accepts_emergency_work
                ),

                "minimum_booking_amount": (
                    provider_profile
                    .minimum_booking_amount
                ),

                "completed_jobs": (
                    provider_profile.completed_jobs
                ),

                "average_rating": (
                    provider_profile.average_rating
                ),

                "service": {
                    "id": (
                        provider_service.id
                        if provider_service
                        else None
                    ),

                    "title": (
                        provider_service.title
                        if provider_service
                        else None
                    ),

                    "pricing_type": (
                        provider_service.pricing_type
                        if provider_service
                        else None
                    ),

                    "base_price": (
                        provider_service.base_price
                        if provider_service
                        else None
                    ),
                },

                "distance_km": match.get(
                    "distance_km"
                ),

                "match_score": match.get(
                    "match_score"
                ),
            }
        )

    return Response(
        {
            "success": True,
            "message": (
                "Matching providers fetched successfully."
            ),

            "request": {
                "id": str(
                    service_request.id
                ),
                "title": service_request.title,
                "category_id": (
                    service_request.category.id
                ),
                "category_name": (
                    service_request.category.name
                ),
                "urgency": (
                    service_request.urgency
                ),
                "preferred_date": (
                    service_request.preferred_date
                ),
                "preferred_start_time": (
                    service_request
                    .preferred_start_time
                ),
                "preferred_end_time": (
                    service_request
                    .preferred_end_time
                ),
                "budget_min": (
                    service_request.budget_min
                ),
                "budget_max": (
                    service_request.budget_max
                ),
            },

            "total_matches": len(
                providers_data
            ),

            "providers": providers_data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsProviderUser,
])
def provider_leads_api(request):
    """
    Return open service requests that match
    the currently logged-in provider.
    """

    # ---------------------------------------------------------
    # GET PROVIDER PROFILE
    # ---------------------------------------------------------

    try:
        provider_profile = request.user.provider_profile

    except Exception:
        return Response(
            {
                "success": False,
                "message": (
                    "Provider profile not found. "
                    "Please complete your provider profile."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # GET REQUESTS THAT CAN STILL RECEIVE PROVIDERS
    # ---------------------------------------------------------

    service_requests = (
        CustomerServiceRequest.objects
        .filter(
            status__in=[
                "open",
                "matched",
                "quoted",
            ]
        )
        .select_related(
            "customer",
            "category",
        )
        .prefetch_related(
            "images",
        )
        .order_by("-created_at")
    )

    leads = []

    # ---------------------------------------------------------
    # RUN EXISTING MATCHING ENGINE
    # ---------------------------------------------------------

    for service_request in service_requests:

        matches = find_matching_providers(
            service_request
        )

        provider_match = None

        for match in matches:

            matched_profile = match[
                "provider_profile"
            ]

            if matched_profile.id == provider_profile.id:
                provider_match = match
                break

        # Logged-in provider did not match this request.
        if provider_match is None:
            continue

        # -----------------------------------------------------
        # GET PROVIDER SERVICE FOR REQUEST CATEGORY
        # -----------------------------------------------------

        provider_service = (
            provider_profile.services
            .filter(
                category=service_request.category,
                is_active=True,
            )
            .first()
        )

        # -----------------------------------------------------
        # IMAGES
        # -----------------------------------------------------

        images = []

        for image in service_request.images.all():

            image_url = None

            if image.image:
                image_url = request.build_absolute_uri(
                    image.image.url
                )

            images.append(
                {
                    "id": image.id,
                    "image_url": image_url,
                }
            )

        # -----------------------------------------------------
        # BUILD LEAD
        # -----------------------------------------------------

        leads.append(
            {
                "request_id": str(
                    service_request.id
                ),

                "title": service_request.title,

                "description": (
                    service_request.description
                ),

                "category": {
                    "id": service_request.category.id,
                    "name": service_request.category.name,
                },

                "urgency": service_request.urgency,

                "preferred_date": (
                    service_request.preferred_date
                ),

                "preferred_start_time": (
                    service_request.preferred_start_time
                ),

                "preferred_end_time": (
                    service_request.preferred_end_time
                ),

                "budget_min": (
                    service_request.budget_min
                ),

                "budget_max": (
                    service_request.budget_max
                ),

                "location": {
                    "service_address": (
                        service_request.service_address
                    ),
                    "city": service_request.city,
                    "state": service_request.state,
                    "postal_code": (
                        service_request.postal_code
                    ),
                    "latitude": (
                        service_request.latitude
                    ),
                    "longitude": (
                        service_request.longitude
                    ),
                },

                "provider_service": {
                    "id": (
                        provider_service.id
                        if provider_service
                        else None
                    ),
                    "title": (
                        provider_service.title
                        if provider_service
                        else None
                    ),
                    "pricing_type": (
                        provider_service.pricing_type
                        if provider_service
                        else None
                    ),
                    "base_price": (
                        provider_service.base_price
                        if provider_service
                        else None
                    ),
                },

                "distance_km": provider_match.get(
                    "distance_km"
                ),

                "match_score": provider_match.get(
                    "match_score"
                ),

                "images": images,

                "status": service_request.status,

                "created_at": (
                    service_request.created_at
                ),
            }
        )

    # ---------------------------------------------------------
    # BEST MATCH FIRST
    # ---------------------------------------------------------

    leads.sort(
        key=lambda lead: (
            -lead["match_score"],
            (
                lead["distance_km"]
                if lead["distance_km"] is not None
                else float("inf")
            ),
        )
    )

    return Response(
        {
            "success": True,
            "message": (
                "Provider leads fetched successfully."
            ),
            "count": len(leads),
            "data": leads,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsProviderUser,
])
def provider_lead_detail_api(request, request_id):
    """
    Return complete details of a service request
    only if the logged-in provider matches the request.
    """

    # ---------------------------------------------------------
    # GET PROVIDER PROFILE
    # ---------------------------------------------------------

    try:
        provider_profile = request.user.provider_profile

    except Exception:
        return Response(
            {
                "success": False,
                "message": (
                    "Provider profile not found. "
                    "Please complete your provider profile."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # GET SERVICE REQUEST
    # ---------------------------------------------------------

    try:
        service_request = (
            CustomerServiceRequest.objects
            .select_related(
                "customer",
                "category",
            )
            .prefetch_related(
                "images",
            )
            .get(
                id=request_id,
                status__in=[
                    "open",
                    "matched",
                    "quoted",
                ],
            )
        )

    except CustomerServiceRequest.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Service request not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # CHECK WHETHER PROVIDER MATCHES THIS REQUEST
    # ---------------------------------------------------------

    matches = find_matching_providers(
        service_request
    )

    provider_match = None

    for match in matches:
        matched_profile = match[
            "provider_profile"
        ]

        if matched_profile.id == provider_profile.id:
            provider_match = match
            break

    if provider_match is None:
        return Response(
            {
                "success": False,
                "message": (
                    "This service request is not available "
                    "for your provider profile."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ---------------------------------------------------------
    # PROVIDER SERVICE
    # ---------------------------------------------------------

    provider_service = (
        provider_profile.services
        .filter(
            category=service_request.category,
            is_active=True,
        )
        .first()
    )

    # ---------------------------------------------------------
    # REQUEST IMAGES
    # ---------------------------------------------------------

    images = []

    for image in service_request.images.all():

        image_url = None

        if image.image:
            image_url = request.build_absolute_uri(
                image.image.url
            )

        images.append(
            {
                "id": image.id,
                "image_url": image_url,
                "uploaded_at": image.uploaded_at,
            }
        )

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    data = {
        "request_id": str(service_request.id),

        "title": service_request.title,

        "description": service_request.description,

        "category": {
            "id": service_request.category.id,
            "name": service_request.category.name,
        },

        "urgency": service_request.urgency,

        "preferred_date": (
            service_request.preferred_date
        ),

        "preferred_start_time": (
            service_request.preferred_start_time
        ),

        "preferred_end_time": (
            service_request.preferred_end_time
        ),

        "budget": {
            "minimum": service_request.budget_min,
            "maximum": service_request.budget_max,
        },

        "location": {
            "service_address": (
                service_request.service_address
            ),
            "city": service_request.city,
            "state": service_request.state,
            "postal_code": (
                service_request.postal_code
            ),
            "latitude": service_request.latitude,
            "longitude": service_request.longitude,
        },

        "provider_service": {
            "id": (
                provider_service.id
                if provider_service
                else None
            ),
            "title": (
                provider_service.title
                if provider_service
                else None
            ),
            "pricing_type": (
                provider_service.pricing_type
                if provider_service
                else None
            ),
            "base_price": (
                provider_service.base_price
                if provider_service
                else None
            ),
        },

        "match": {
            "distance_km": provider_match.get(
                "distance_km"
            ),
            "match_score": provider_match.get(
                "match_score"
            ),
        },

        "images": images,

        "status": service_request.status,

        "created_at": service_request.created_at,
        "updated_at": service_request.updated_at,
    }

    return Response(
        {
            "success": True,
            "message": (
                "Provider lead details fetched successfully."
            ),
            "data": data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    IsProviderUser,
])
def submit_quotation_api(request, request_id):
    """
    Allow a matched provider to submit one quotation
    for a customer service request.

    After successful quotation creation,
    notify the customer.
    """

    # ---------------------------------------------------------
    # GET PROVIDER PROFILE
    # ---------------------------------------------------------

    try:
        provider_profile = request.user.provider_profile

    except Exception:
        return Response(
            {
                "success": False,
                "message": (
                    "Provider profile not found. "
                    "Please complete your provider profile."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # GET SERVICE REQUEST
    # ---------------------------------------------------------

    try:
        service_request = (
            CustomerServiceRequest.objects
            .select_related(
                "customer",
                "category",
            )
            .get(
                id=request_id,
                status__in=[
                    "open",
                    "matched",
                    "quoted",
                ],
            )
        )

    except CustomerServiceRequest.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": (
                    "Service request not found or "
                    "is no longer accepting quotations."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # VERIFY PROVIDER MATCH
    # ---------------------------------------------------------

    matches = find_matching_providers(
        service_request
    )

    is_matched = any(
        match["provider_profile"].id
        == provider_profile.id
        for match in matches
    )

    if not is_matched:
        return Response(
            {
                "success": False,
                "message": (
                    "You are not eligible to submit a "
                    "quotation for this service request."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ---------------------------------------------------------
    # PREVENT DUPLICATE QUOTATION
    # ---------------------------------------------------------

    existing_quotation = (
        ProviderQuotation.objects
        .filter(
            service_request=service_request,
            provider_profile=provider_profile,
        )
        .first()
    )

    if existing_quotation:
        return Response(
            {
                "success": False,
                "message": (
                    "You have already submitted a quotation "
                    "for this service request."
                ),
                "quotation_id": existing_quotation.id,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # VALIDATE QUOTATION
    # ---------------------------------------------------------

    serializer = ProviderQuotationSerializer(
        data=request.data,
        context={
            "request": request,
        },
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": (
                    "Quotation submission failed."
                ),
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # SAVE QUOTATION
    # ---------------------------------------------------------

    quotation = serializer.save(
        service_request=service_request,
        provider_profile=provider_profile,
        status="pending",
    )

    # ---------------------------------------------------------
    # UPDATE REQUEST STATUS
    # ---------------------------------------------------------

    if service_request.status in [
        "open",
        "matched",
    ]:
        service_request.status = "quoted"

        service_request.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

    # ---------------------------------------------------------
    # NOTIFY CUSTOMER
    # ---------------------------------------------------------

    provider_user = provider_profile.provider

    provider_name = (
        provider_profile.business_name
        or provider_user.get_full_name()
        or provider_user.username
        or provider_user.email
    )

    create_notification(
        user=service_request.customer,
        notification_type="quotation_received",
        title="New quotation received",
        message=(
            f"{provider_name} sent you a quotation of "
            f"₹{quotation.quoted_price} for "
            f"{service_request.title}."
        ),
        service_request=service_request,
    )

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return Response(
        {
            "success": True,
            "message": (
                "Quotation submitted successfully."
            ),
            "data": ProviderQuotationSerializer(
                quotation,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsCustomerUser,
])
def customer_request_quotations_api(request, request_id):
    """
    Return all quotations submitted for one of the
    authenticated customer's service requests.
    """

    # ---------------------------------------------------------
    # GET CUSTOMER SERVICE REQUEST
    # ---------------------------------------------------------

    try:
        service_request = (
            CustomerServiceRequest.objects
            .select_related(
                "customer",
                "category",
            )
            .get(
                id=request_id,
                customer=request.user,
            )
        )

    except CustomerServiceRequest.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Service request not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # FETCH QUOTATIONS
    # ---------------------------------------------------------

    quotations = (
        ProviderQuotation.objects
        .filter(
            service_request=service_request,
        )
        .exclude(
            status="withdrawn",
        )
        .select_related(
            "provider_profile",
            "provider_profile__provider",
        )
        .order_by(
            "quoted_price",
            "-created_at",
        )
    )

    # ---------------------------------------------------------
    # SERIALIZE
    # ---------------------------------------------------------

    serializer = ProviderQuotationSerializer(
        quotations,
        many=True,
        context={
            "request": request,
        },
    )

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return Response(
        {
            "success": True,
            "message": (
                "Quotations fetched successfully."
            ),

            "request": {
                "id": str(service_request.id),

                "title": service_request.title,

                "description": (
                    service_request.description
                ),

                "category": {
                    "id": service_request.category.id,
                    "name": service_request.category.name,
                    "key": service_request.category.key,
                },

                "urgency": (
                    service_request.urgency
                ),

                "preferred_date": (
                    service_request.preferred_date
                ),

                "preferred_start_time": (
                    service_request.preferred_start_time
                ),

                "preferred_end_time": (
                    service_request.preferred_end_time
                ),

                "budget_min": (
                    service_request.budget_min
                ),

                "budget_max": (
                    service_request.budget_max
                ),

                "status": (
                    service_request.status
                ),
            },

            "total_quotations": quotations.count(),

            "quotations": serializer.data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    IsCustomerUser,
])
@transaction.atomic
def accept_quotation_api(
    request,
    request_id,
    quotation_id,
):
    """
    Accept one quotation, create the booking,
    and notify the selected provider and customer.
    """

    # ---------------------------------------------------------
    # LOCK CUSTOMER SERVICE REQUEST
    # ---------------------------------------------------------

    try:
        service_request = (
            CustomerServiceRequest.objects
            .select_for_update()
            .select_related(
                "customer",
                "category",
            )
            .get(
                id=request_id,
                customer=request.user,
            )
        )

    except CustomerServiceRequest.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Service request not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # VALID REQUEST STATUS
    # ---------------------------------------------------------

    if service_request.status not in [
        "open",
        "matched",
        "quoted",
    ]:
        return Response(
            {
                "success": False,
                "message": (
                    "This service request is no longer "
                    "accepting quotation selection."
                ),
                "current_status": service_request.status,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # PREVENT SECOND BOOKING
    # ---------------------------------------------------------

    if ServiceBooking.objects.filter(
        service_request=service_request
    ).exists():
        return Response(
            {
                "success": False,
                "message": (
                    "A provider has already been selected "
                    "for this service request."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # LOCK SELECTED QUOTATION
    # ---------------------------------------------------------

    try:
        quotation = (
            ProviderQuotation.objects
            .select_for_update()
            .select_related(
                "provider_profile",
                "provider_profile__provider",
            )
            .get(
                id=quotation_id,
                service_request=service_request,
            )
        )

    except ProviderQuotation.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Quotation not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # QUOTATION MUST STILL BE PENDING
    # ---------------------------------------------------------

    if quotation.status != "pending":
        return Response(
            {
                "success": False,
                "message": (
                    "This quotation can no longer be accepted."
                ),
                "quotation_status": quotation.status,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # PROVIDER MUST STILL BE AVAILABLE
    # ---------------------------------------------------------

    provider_profile = quotation.provider_profile
    provider_user = provider_profile.provider

    if (
        not provider_user.is_active
        or not provider_user.is_approved
        or not provider_profile.is_profile_active
        or not provider_profile.is_available
    ):
        return Response(
            {
                "success": False,
                "message": (
                    "Selected provider is no longer available."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # ACCEPT SELECTED QUOTATION
    # ---------------------------------------------------------

    quotation.status = "accepted"

    quotation.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    # ---------------------------------------------------------
    # REJECT OTHER PENDING QUOTATIONS
    # ---------------------------------------------------------

    (
        ProviderQuotation.objects
        .filter(
            service_request=service_request,
            status="pending",
        )
        .exclude(
            id=quotation.id,
        )
        .update(
            status="rejected",
        )
    )

    # ---------------------------------------------------------
    # UPDATE SERVICE REQUEST
    # ---------------------------------------------------------

    service_request.status = "accepted"

    service_request.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    # ---------------------------------------------------------
    # CREATE BOOKING
    # ---------------------------------------------------------

    booking = ServiceBooking.objects.create(
        service_request=service_request,
        quotation=quotation,
        customer=request.user,
        provider_profile=provider_profile,
        final_price=quotation.quoted_price,
        scheduled_date=service_request.preferred_date,
        scheduled_start_time=(
            service_request.preferred_start_time
        ),
        scheduled_end_time=(
            service_request.preferred_end_time
        ),
        status="accepted",
    )

    # ---------------------------------------------------------
    # PROVIDER NAME
    # ---------------------------------------------------------

    provider_name = (
        provider_profile.business_name
        or provider_user.get_full_name()
        or provider_user.username
        or provider_user.email
    )

    customer_name = (
        request.user.get_full_name()
        or request.user.username
        or request.user.email
    )

    # ---------------------------------------------------------
    # NOTIFY PROVIDER - QUOTATION ACCEPTED
    # ---------------------------------------------------------

    create_notification(
        user=provider_user,
        notification_type="quotation_accepted",
        title="Quotation accepted",
        message=(
            f"{customer_name} accepted your quotation of "
            f"₹{quotation.quoted_price} for "
            f"{service_request.title}."
        ),
        service_request=service_request,
        booking=booking,
    )

    # ---------------------------------------------------------
    # NOTIFY PROVIDER - BOOKING CREATED
    # ---------------------------------------------------------

    create_notification(
        user=provider_user,
        notification_type="booking_created",
        title="New booking created",
        message=(
            f"A booking has been created for "
            f"{service_request.title}."
        ),
        service_request=service_request,
        booking=booking,
    )

    # ---------------------------------------------------------
    # NOTIFY CUSTOMER - BOOKING CREATED
    # ---------------------------------------------------------

    create_notification(
        user=request.user,
        notification_type="booking_created",
        title="Booking confirmed",
        message=(
            f"Your booking with {provider_name} has been "
            f"confirmed for ₹{booking.final_price}."
        ),
        service_request=service_request,
        booking=booking,
    )

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return Response(
        {
            "success": True,
            "message": (
                "Quotation accepted and booking "
                "created successfully."
            ),
            "data": ServiceBookingSerializer(
                booking,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )
from django.db.models import Q
@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsBookingParticipant,
])
def my_bookings_api(request):
    """
    Return bookings belonging to the authenticated user.

    Customer:
        bookings created by the customer.

    Provider:
        bookings assigned to the provider.
    """

    bookings = (
        ServiceBooking.objects
        .filter(
            Q(customer=request.user)
            | Q(provider_profile__provider=request.user)
        )
        .select_related(
            "service_request",
            "service_request__category",
            "quotation",
            "customer",
            "provider_profile",
            "provider_profile__provider",
        )
        .order_by("-created_at")
    )

    serializer = ServiceBookingSerializer(
        bookings,
        many=True,
        context={
            "request": request,
        },
    )

    return Response(
        {
            "success": True,
            "message": "Bookings fetched successfully.",
            "count": bookings.count(),
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsBookingParticipant,
])
def booking_detail_api(request, booking_id):
    """
    Return one booking if the authenticated user
    is either its customer or provider.
    """

    try:
        booking = (
            ServiceBooking.objects
            .select_related(
                "service_request",
                "service_request__category",
                "quotation",
                "customer",
                "provider_profile",
                "provider_profile__provider",
            )
            .get(
                Q(customer=request.user)
                | Q(
                    provider_profile__provider=request.user
                ),
                id=booking_id,
            )
        )

    except ServiceBooking.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Booking not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "success": True,
            "message": "Booking fetched successfully.",
            "data": ServiceBookingSerializer(
                booking,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    IsProviderUser,
])
@transaction.atomic
def start_booking_api(request, booking_id):
    """
    Allow the assigned provider to start work
    and notify the customer.
    """

    try:
        booking = (
            ServiceBooking.objects
            .select_for_update()
            .select_related(
                "service_request",
                "customer",
                "provider_profile",
                "provider_profile__provider",
            )
            .get(
                id=booking_id,
                provider_profile__provider=request.user,
            )
        )

    except ServiceBooking.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Booking not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # VALIDATE STATUS
    # ---------------------------------------------------------

    if booking.status not in [
        "accepted",
        "scheduled",
    ]:
        return Response(
            {
                "success": False,
                "message": (
                    "This booking cannot be started "
                    "in its current status."
                ),
                "current_status": booking.status,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # UPDATE BOOKING
    # ---------------------------------------------------------

    booking.status = "in_progress"

    booking.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    # ---------------------------------------------------------
    # UPDATE SERVICE REQUEST
    # ---------------------------------------------------------

    service_request = booking.service_request

    service_request.status = "in_progress"

    service_request.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    # ---------------------------------------------------------
    # PROVIDER NAME
    # ---------------------------------------------------------

    provider_profile = booking.provider_profile
    provider_user = provider_profile.provider

    provider_name = (
        provider_profile.business_name
        or provider_user.get_full_name()
        or provider_user.username
        or provider_user.email
    )

    # ---------------------------------------------------------
    # NOTIFY CUSTOMER
    # ---------------------------------------------------------

    create_notification(
        user=booking.customer,
        notification_type="work_started",
        title="Work started",
        message=(
            f"{provider_name} has started work on "
            f"{service_request.title}."
        ),
        service_request=service_request,
        booking=booking,
    )

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return Response(
        {
            "success": True,
            "message": "Work started successfully.",
            "data": ServiceBookingSerializer(
                booking,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    IsProviderUser,
])
@transaction.atomic
def complete_booking_api(request, booking_id):
    """
    Allow the assigned provider to mark work completed
    and notify the customer.
    """

    try:
        booking = (
            ServiceBooking.objects
            .select_for_update()
            .select_related(
                "service_request",
                "customer",
                "provider_profile",
                "provider_profile__provider",
            )
            .get(
                id=booking_id,
                provider_profile__provider=request.user,
            )
        )

    except ServiceBooking.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Booking not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # VALIDATE STATUS
    # ---------------------------------------------------------

    if booking.status != "in_progress":
        return Response(
            {
                "success": False,
                "message": (
                    "Only an in-progress booking "
                    "can be completed."
                ),
                "current_status": booking.status,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # COMPLETE BOOKING
    # ---------------------------------------------------------

    booking.status = "completed"
    booking.completed_at = timezone.now()

    booking.save(
        update_fields=[
            "status",
            "completed_at",
            "updated_at",
        ]
    )

    # ---------------------------------------------------------
    # UPDATE SERVICE REQUEST
    # ---------------------------------------------------------

    service_request = booking.service_request

    service_request.status = "completed"

    service_request.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    # ---------------------------------------------------------
    # UPDATE PROVIDER STATISTICS
    # ---------------------------------------------------------

    provider_profile = booking.provider_profile

    provider_profile.completed_jobs += 1

    provider_profile.save(
        update_fields=[
            "completed_jobs",
            "updated_at",
        ]
    )

    # ---------------------------------------------------------
    # PROVIDER NAME
    # ---------------------------------------------------------

    provider_user = provider_profile.provider

    provider_name = (
        provider_profile.business_name
        or provider_user.get_full_name()
        or provider_user.username
        or provider_user.email
    )

    # ---------------------------------------------------------
    # NOTIFY CUSTOMER
    # ---------------------------------------------------------

    create_notification(
        user=booking.customer,
        notification_type="work_completed",
        title="Work completed",
        message=(
            f"{provider_name} has marked "
            f"{service_request.title} as completed. "
            f"You can now review your service."
        ),
        service_request=service_request,
        booking=booking,
    )

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return Response(
        {
            "success": True,
            "message": "Work completed successfully.",
            "data": ServiceBookingSerializer(
                booking,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    IsBookingParticipant,
])
@transaction.atomic
def cancel_booking_api(request, booking_id):
    """
    Allow the customer or assigned provider
    to cancel an active booking.

    The other participant is notified automatically.
    """

    try:
        booking = (
            ServiceBooking.objects
            .select_for_update()
            .select_related(
                "service_request",
                "customer",
                "provider_profile",
                "provider_profile__provider",
            )
            .get(
                Q(customer=request.user)
                | Q(
                    provider_profile__provider=request.user
                ),
                id=booking_id,
            )
        )

    except ServiceBooking.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Booking not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # VALIDATE STATUS
    # ---------------------------------------------------------

    if booking.status in [
        "completed",
        "cancelled",
    ]:
        return Response(
            {
                "success": False,
                "message": (
                    "This booking cannot be cancelled."
                ),
                "current_status": booking.status,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # CANCELLATION REASON
    # ---------------------------------------------------------

    cancellation_reason = (
        request.data.get(
            "cancellation_reason",
            ""
        )
        .strip()
    )

    if not cancellation_reason:
        return Response(
            {
                "success": False,
                "message": (
                    "Cancellation reason is required."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # IDENTIFY WHO CANCELLED
    # ---------------------------------------------------------

    provider_user = (
        booking.provider_profile.provider
    )

    cancelled_by_customer = (
        request.user.id == booking.customer_id
    )

    # ---------------------------------------------------------
    # CANCEL BOOKING
    # ---------------------------------------------------------

    booking.status = "cancelled"
    booking.cancellation_reason = cancellation_reason

    booking.save(
        update_fields=[
            "status",
            "cancellation_reason",
            "updated_at",
        ]
    )

    # ---------------------------------------------------------
    # UPDATE SERVICE REQUEST
    # ---------------------------------------------------------

    service_request = booking.service_request

    service_request.status = "cancelled"
    service_request.cancellation_reason = (
        cancellation_reason
    )

    service_request.save(
        update_fields=[
            "status",
            "cancellation_reason",
            "updated_at",
        ]
    )

    # ---------------------------------------------------------
    # NOTIFY OTHER PARTICIPANT
    # ---------------------------------------------------------

    if cancelled_by_customer:

        customer_name = (
            booking.customer.get_full_name()
            or booking.customer.username
            or booking.customer.email
        )

        create_notification(
            user=provider_user,
            notification_type="booking_cancelled",
            title="Booking cancelled",
            message=(
                f"{customer_name} cancelled the booking "
                f"for {service_request.title}. "
                f"Reason: {cancellation_reason}"
            ),
            service_request=service_request,
            booking=booking,
        )

    else:

        provider_profile = booking.provider_profile

        provider_name = (
            provider_profile.business_name
            or provider_user.get_full_name()
            or provider_user.username
            or provider_user.email
        )

        create_notification(
            user=booking.customer,
            notification_type="booking_cancelled",
            title="Booking cancelled",
            message=(
                f"{provider_name} cancelled your booking "
                f"for {service_request.title}. "
                f"Reason: {cancellation_reason}"
            ),
            service_request=service_request,
            booking=booking,
        )

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return Response(
        {
            "success": True,
            "message": "Booking cancelled successfully.",
            "data": ServiceBookingSerializer(
                booking,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    IsCustomerUser,
])
@transaction.atomic
def submit_review_api(request, booking_id):
    """
    Allow a customer to review a provider
    after the booking has been completed.

    After the review is created:
    - Recalculate provider average rating.
    - Notify the provider.
    """

    # ---------------------------------------------------------
    # GET BOOKING
    # ---------------------------------------------------------

    try:
        booking = (
            ServiceBooking.objects
            .select_for_update()
            .select_related(
                "customer",
                "provider_profile",
                "provider_profile__provider",
                "service_request",
            )
            .get(
                id=booking_id,
                customer=request.user,
            )
        )

    except ServiceBooking.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Booking not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # BOOKING MUST BE COMPLETED
    # ---------------------------------------------------------

    if booking.status != "completed":
        return Response(
            {
                "success": False,
                "message": (
                    "You can review a provider only after "
                    "the booking is completed."
                ),
                "current_status": booking.status,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # PREVENT DUPLICATE REVIEW
    # ---------------------------------------------------------

    if ServiceReview.objects.filter(
        booking=booking
    ).exists():
        return Response(
            {
                "success": False,
                "message": (
                    "You have already reviewed this booking."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # VALIDATE REVIEW
    # ---------------------------------------------------------

    serializer = ServiceReviewSerializer(
        data=request.data,
        context={
            "request": request,
        },
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Review submission failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------------------------------------------------------
    # CREATE REVIEW
    # ---------------------------------------------------------

    review = serializer.save(
        booking=booking,
        customer=request.user,
        provider_profile=booking.provider_profile,
    )

    # ---------------------------------------------------------
    # RECALCULATE PROVIDER RATING
    # ---------------------------------------------------------

    new_average_rating = recalculate_provider_rating(
        booking.provider_profile
    )

    # ---------------------------------------------------------
    # NOTIFY PROVIDER
    # ---------------------------------------------------------

    provider_user = (
        booking.provider_profile.provider
    )

    customer_name = (
        request.user.get_full_name()
        or request.user.username
        or request.user.email
    )

    create_notification(
        user=provider_user,
        notification_type="review_received",
        title="New review received",
        message=(
            f"{customer_name} gave you a "
            f"{review.rating}-star review for "
            f"{booking.service_request.title}."
        ),
        service_request=booking.service_request,
        booking=booking,
    )

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return Response(
        {
            "success": True,
            "message": "Review submitted successfully.",
            "provider_average_rating": new_average_rating,
            "data": ServiceReviewSerializer(
                review,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsCustomerUser,
])
def booking_review_api(request, booking_id):
    """
    Return the review submitted for a customer's booking.
    """

    try:
        booking = (
            ServiceBooking.objects
            .select_related(
                "customer",
                "provider_profile",
                "provider_profile__provider",
            )
            .get(
                id=booking_id,
                customer=request.user,
            )
        )

    except ServiceBooking.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Booking not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        review = booking.review

    except ServiceReview.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Review has not been submitted yet.",
                "has_review": False,
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "success": True,
            "message": "Review fetched successfully.",
            "has_review": True,
            "data": ServiceReviewSerializer(
                review,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
])
def provider_reviews_api(request, provider_id):
    """
    Return all reviews for a provider along with
    rating summary information.
    """

    from providers.models import ProviderProfile

    # ---------------------------------------------------------
    # GET PROVIDER PROFILE
    # ---------------------------------------------------------

    try:
        provider_profile = (
            ProviderProfile.objects
            .select_related("provider")
            .get(
                provider_id=provider_id,
                is_profile_active=True,
            )
        )

    except ProviderProfile.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Provider not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # GET REVIEWS
    # ---------------------------------------------------------

    reviews = (
        ServiceReview.objects
        .filter(
            provider_profile=provider_profile
        )
        .select_related(
            "customer",
            "provider_profile",
            "provider_profile__provider",
            "booking",
        )
        .order_by("-created_at")
    )

    # ---------------------------------------------------------
    # RATING BREAKDOWN
    # ---------------------------------------------------------

    rating_breakdown = {
        "5": reviews.filter(rating=5).count(),
        "4": reviews.filter(rating=4).count(),
        "3": reviews.filter(rating=3).count(),
        "2": reviews.filter(rating=2).count(),
        "1": reviews.filter(rating=1).count(),
    }

    # ---------------------------------------------------------
    # SERIALIZE REVIEWS
    # ---------------------------------------------------------

    serializer = ServiceReviewSerializer(
        reviews,
        many=True,
        context={
            "request": request,
        },
    )

    provider_user = provider_profile.provider

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return Response(
        {
            "success": True,
            "message": "Provider reviews fetched successfully.",

            "provider": {
                "provider_id": provider_user.id,

                "provider_name": (
                    provider_user.get_full_name()
                    or provider_user.username
                    or provider_user.email
                ),

                "business_name": (
                    provider_profile.business_name
                ),

                "professional_title": (
                    provider_profile.professional_title
                ),

                "average_rating": (
                    provider_profile.average_rating
                ),

                "total_reviews": reviews.count(),

                "completed_jobs": (
                    provider_profile.completed_jobs
                ),
            },

            "rating_breakdown": rating_breakdown,

            "reviews": serializer.data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
])
def notifications_api(request):
    """
    Return notifications for the logged-in user.
    """

    notifications = (
        ServiceNotification.objects
        .filter(
            user=request.user
        )
        .select_related(
            "service_request",
            "booking",
        )
        .order_by("-created_at")
    )

    unread_count = notifications.filter(
        is_read=False
    ).count()

    serializer = ServiceNotificationSerializer(
        notifications,
        many=True,
    )

    return Response(
        {
            "success": True,
            "message": "Notifications fetched successfully.",
            "count": notifications.count(),
            "unread_count": unread_count,
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
])
def mark_notification_read_api(
    request,
    notification_id,
):
    """
    Mark one notification as read.
    """

    try:
        notification = ServiceNotification.objects.get(
            id=notification_id,
            user=request.user,
        )

    except ServiceNotification.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Notification not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if not notification.is_read:

        notification.is_read = True

        notification.save(
            update_fields=[
                "is_read",
            ]
        )

    return Response(
        {
            "success": True,
            "message": "Notification marked as read.",
            "data": ServiceNotificationSerializer(
                notification
            ).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
])
def mark_all_notifications_read_api(request):
    """
    Mark all unread notifications for the
    logged-in user as read.
    """

    updated_count = (
        ServiceNotification.objects
        .filter(
            user=request.user,
            is_read=False,
        )
        .update(
            is_read=True
        )
    )

    return Response(
        {
            "success": True,
            "message": (
                "All notifications marked as read."
            ),
            "updated_count": updated_count,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_request_tracking(
    request,
    request_id,
):
    """
    Return lifecycle tracking information
    for one customer service request.

    Customers can only track their own requests.
    """

    user = request.user

    # =========================================================
    # CUSTOMER ACCESS
    # =========================================================

    if user.role != "customer":
        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can track "
                    "service requests."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # SERVICE REQUEST
    # =========================================================

    service_request = (
        CustomerServiceRequest.objects
        .select_related(
            "category",
            "customer",
        )
        .filter(
            id=request_id,
            customer=user,
        )
        .first()
    )

    if not service_request:
        return Response(
            {
                "success": False,
                "message": (
                    "Service request not found."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # TRACKING
    # =========================================================

    tracking = build_request_tracking(
        service_request
    )

    # =========================================================
    # QUOTATIONS
    # =========================================================

    quotations = (
        ProviderQuotation.objects
        .filter(
            service_request=service_request
        )
    )

    total_quotations = quotations.count()

    pending_quotations = (
        quotations
        .filter(status="pending")
        .count()
    )

    accepted_quotation = (
        quotations
        .filter(status="accepted")
        .select_related(
            "provider_profile",
            "provider_profile__provider",
        )
        .first()
    )

    # =========================================================
    # BOOKING
    # =========================================================

    booking = (
        ServiceBooking.objects
        .filter(
            service_request=service_request
        )
        .select_related(
            "provider_profile",
            "provider_profile__provider",
            "quotation",
        )
        .first()
    )

    # =========================================================
    # ACCEPTED PROVIDER
    # =========================================================

    accepted_provider = None

    if accepted_quotation:

        provider = (
            accepted_quotation
            .provider_profile
            .provider
        )

        accepted_provider = {
            "id": provider.id,

            "username": (
                provider.username
            ),

            "full_name": (
                provider.get_full_name()
                or provider.username
            ),

            "is_verified": (
                provider.is_verified
            ),

            "quoted_price": str(
                accepted_quotation
                .quoted_price
            ),
        }

    # =========================================================
    # BOOKING PAYLOAD
    # =========================================================

    booking_data = None

    if booking:

        provider = (
            booking
            .provider_profile
            .provider
        )

        booking_data = {
            "id": booking.id,

            "status": booking.status,

            "final_price": str(
                booking.final_price
            ),

            "scheduled_date": (
                booking.scheduled_date
            ),

            "scheduled_start_time": (
                booking.scheduled_start_time
            ),

            "scheduled_end_time": (
                booking.scheduled_end_time
            ),

            "provider": {
                "id": provider.id,

                "username": (
                    provider.username
                ),

                "full_name": (
                    provider.get_full_name()
                    or provider.username
                ),

                "is_verified": (
                    provider.is_verified
                ),
            },

            "created_at": (
                booking.created_at
            ),

            "updated_at": (
                booking.updated_at
            ),

            "completed_at": (
                booking.completed_at
            ),
        }

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Service request tracking "
                "fetched successfully."
            ),

            "request": {
                "id": str(
                    service_request.id
                ),

                "title": (
                    service_request.title
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

                "urgency": (
                    service_request.urgency
                ),

                "preferred_date": (
                    service_request.preferred_date
                ),

                "preferred_start_time": (
                    service_request
                    .preferred_start_time
                ),

                "preferred_end_time": (
                    service_request
                    .preferred_end_time
                ),

                "service_address": (
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
                    service_request
                    .postal_code
                ),

                "created_at": (
                    service_request.created_at
                ),

                "updated_at": (
                    service_request.updated_at
                ),
            },

            "tracking": tracking,

            "quotations": {
                "total": (
                    total_quotations
                ),

                "pending": (
                    pending_quotations
                ),

                "has_accepted_quotation": (
                    accepted_quotation
                    is not None
                ),

                "accepted_provider": (
                    accepted_provider
                ),
            },

            "booking": booking_data,

            "cancellation": {
                "is_cancelled": (
                    service_request.status
                    == "cancelled"
                ),

                "reason": (
                    service_request
                    .cancellation_reason
                    or None
                ),
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_quotation_comparison(
    request,
    request_id,
):
    """
    Return all available quotations for one customer
    service request in a frontend-friendly comparison format.

    Only the owner of the service request can access it.
    """

    user = request.user

    # =========================================================
    # CUSTOMER ACCESS
    # =========================================================

    if user.role != "customer":
        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can compare quotations."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # SERVICE REQUEST
    # =========================================================

    service_request = (
        CustomerServiceRequest.objects
        .select_related("category")
        .filter(
            id=request_id,
            customer=user,
        )
        .first()
    )

    if not service_request:
        return Response(
            {
                "success": False,
                "message": "Service request not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # QUOTATIONS
    # =========================================================

    quotations = (
        ProviderQuotation.objects
        .filter(
            service_request=service_request
        )
        .exclude(
            status="withdrawn"
        )
        .select_related(
            "provider_profile",
            "provider_profile__provider",
        )
        .order_by(
            "quoted_price",
            "created_at",
        )
    )

    quotation_data = []

    for quotation in quotations:

        provider_profile = (
            quotation.provider_profile
        )

        provider = (
            provider_profile.provider
        )

        # =====================================================
        # PROVIDER RATING
        # =====================================================

        rating_stats = (
            provider_profile.reviews
            .aggregate(
                average_rating=Avg("rating"),
                total_reviews=Count("id"),
            )
        )

        average_rating = round(
            float(
                rating_stats["average_rating"]
                or 0
            ),
            1,
        )

        total_reviews = (
            rating_stats["total_reviews"]
            or 0
        )

        # =====================================================
        # PROVIDER JOB STATS
        # =====================================================

        provider_bookings = (
            provider_profile.service_bookings
        )

        total_jobs = (
            provider_bookings.count()
        )

        completed_jobs = (
            provider_bookings
            .filter(status="completed")
            .count()
        )

        # =====================================================
        # COMPLETION RATE
        # =====================================================

        completion_rate = 0

        if total_jobs > 0:
            completion_rate = round(
                (
                    completed_jobs
                    / total_jobs
                )
                * 100,
                2,
            )

        # =====================================================
        # QUOTATION DATA
        # =====================================================

        quotation_data.append(
            {
                "quotation_id": quotation.id,

                "quoted_price": str(
                    quotation.quoted_price
                ),

                "message": (
                    quotation.message
                ),

                "estimated_duration_minutes": (
                    quotation
                    .estimated_duration_minutes
                ),

                "status": quotation.status,

                "created_at": (
                    quotation.created_at
                ),

                "provider": {
                    "id": provider.id,

                    "username": (
                        provider.username
                    ),

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

                    "role": (
                        provider.role
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

                    "average_rating": (
                        average_rating
                    ),

                    "total_reviews": (
                        total_reviews
                    ),

                    "completed_jobs": (
                        completed_jobs
                    ),

                    "completion_rate": (
                        completion_rate
                    ),
                },
            }
        )

    # =========================================================
    # PRICE SUMMARY
    # =========================================================

    prices = [
        quotation.quoted_price
        for quotation in quotations
    ]

    lowest_price = None
    highest_price = None
    average_price = None

    if prices:

        lowest_price = min(prices)
        highest_price = max(prices)

        average_price = (
            sum(prices)
            / len(prices)
        )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Quotation comparison "
                "fetched successfully."
            ),

            "request": {
                "id": str(
                    service_request.id
                ),

                "title": (
                    service_request.title
                ),

                "status": (
                    service_request.status
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

                "urgency": (
                    service_request.urgency
                ),

                "budget": {
                    "minimum": (
                        str(service_request.budget_min)
                        if service_request.budget_min
                        is not None
                        else None
                    ),

                    "maximum": (
                        str(service_request.budget_max)
                        if service_request.budget_max
                        is not None
                        else None
                    ),
                },
            },

            "summary": {
                "total_quotations": (
                    len(quotation_data)
                ),

                "lowest_price": (
                    str(lowest_price)
                    if lowest_price is not None
                    else None
                ),

                "highest_price": (
                    str(highest_price)
                    if highest_price is not None
                    else None
                ),

                "average_price": (
                    str(
                        round(
                            average_price,
                            2,
                        )
                    )
                    if average_price is not None
                    else None
                ),
            },

            "quotations": quotation_data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_booking_history(request):
    """
    Return booking history for the
    currently logged-in customer.

    Filters:
    ?status=completed
    ?service=plumber
    ?page=1
    ?page_size=10
    """

    user = request.user

    # =========================================================
    # CUSTOMER ACCESS
    # =========================================================

    if user.role != "customer":

        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can access "
                    "booking history."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # BASE QUERYSET
    # =========================================================

    base_queryset = (
        ServiceBooking.objects
        .filter(customer=user)
    )

    # =========================================================
    # COMPLETE BOOKING SUMMARY
    # =========================================================

    summary = {
        "total": (
            base_queryset.count()
        ),

        "accepted": (
            base_queryset
            .filter(status="accepted")
            .count()
        ),

        "scheduled": (
            base_queryset
            .filter(status="scheduled")
            .count()
        ),

        "in_progress": (
            base_queryset
            .filter(status="in_progress")
            .count()
        ),

        "completed": (
            base_queryset
            .filter(status="completed")
            .count()
        ),

        "cancelled": (
            base_queryset
            .filter(status="cancelled")
            .count()
        ),
    }

    # =========================================================
    # FILTERS
    # =========================================================

    booking_status = (
        request.query_params
        .get("status")
    )

    service_key = (
        request.query_params
        .get("service")
    )

    valid_statuses = [
        "accepted",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
    ]

    if booking_status:

        booking_status = (
            booking_status
            .strip()
            .lower()
        )

        if booking_status not in valid_statuses:

            return Response(
                {
                    "success": False,

                    "message": (
                        "Invalid booking status."
                    ),

                    "allowed_statuses": (
                        valid_statuses
                    ),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

    if service_key:

        service_key = (
            service_key
            .strip()
            .lower()
        )

    # =========================================================
    # APPLY FILTERS
    # =========================================================

    bookings = base_queryset

    if booking_status:

        bookings = (
            bookings
            .filter(
                status=booking_status
            )
        )

    if service_key:

        bookings = (
            bookings
            .filter(
                service_request__category__key=(
                    service_key
                )
            )
        )

    # =========================================================
    # QUERY OPTIMIZATION
    # =========================================================

    bookings = (
        bookings
        .select_related(
            "service_request",
            "service_request__category",
            "provider_profile",
            "provider_profile__provider",
            "quotation",
            "review",
        )
        .order_by("-created_at")
    )

    # =========================================================
    # PAGINATION
    # =========================================================

    try:
        page_number = int(
            request.query_params.get(
                "page",
                1,
            )
        )
    except (TypeError, ValueError):
        page_number = 1

    try:
        page_size = int(
            request.query_params.get(
                "page_size",
                10,
            )
        )
    except (TypeError, ValueError):
        page_size = 10

    page_number = max(
        page_number,
        1,
    )

    page_size = max(
        1,
        min(
            page_size,
            100,
        ),
    )

    paginator = Paginator(
        bookings,
        page_size,
    )

    page = paginator.get_page(
        page_number
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Customer booking history "
                "fetched successfully."
            ),

            "summary": summary,

            "filters": {
                "status": (
                    booking_status
                ),

                "service": (
                    service_key
                ),
            },

            "pagination": {
                "page": (
                    page.number
                ),

                "page_size": (
                    page_size
                ),

                "total_items": (
                    paginator.count
                ),

                "total_pages": (
                    paginator.num_pages
                ),

                "has_next": (
                    page.has_next()
                ),

                "has_previous": (
                    page.has_previous()
                ),
            },

            "bookings": [
                serialize_customer_booking(
                    booking,
                    request,
                )
                for booking
                in page.object_list
            ],
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_booking_detail(
    request,
    booking_id,
):
    """
    Return complete details for one customer booking.

    Security:
    A customer can only view their own booking.
    """

    user = request.user

    # =========================================================
    # CUSTOMER ACCESS
    # =========================================================

    if user.role != "customer":
        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can access "
                    "booking details."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # BOOKING
    # =========================================================

    booking = (
        ServiceBooking.objects
        .filter(
            id=booking_id,
            customer=user,
        )
        .select_related(
            "service_request",
            "service_request__category",
            "quotation",
            "provider_profile",
            "provider_profile__provider",
            "review",
        )
        .first()
    )

    if not booking:
        return Response(
            {
                "success": False,
                "message": (
                    "Booking not found."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # SERVICE REQUEST
    # =========================================================

    service_request = (
        booking.service_request
    )

    # =========================================================
    # ACCEPTED QUOTATION
    # =========================================================

    quotation = (
        booking.quotation
    )

    quotation_data = {
        "id": quotation.id,

        "quoted_price": str(
            quotation.quoted_price
        ),

        "message": (
            quotation.message
        ),

        "estimated_duration_minutes": (
            quotation
            .estimated_duration_minutes
        ),

        "status": (
            quotation.status
        ),

        "created_at": (
            quotation.created_at
        ),

        "updated_at": (
            quotation.updated_at
        ),
    }

    # =========================================================
    # ALL QUOTATION SUMMARY
    # =========================================================

    request_quotations = (
        ProviderQuotation.objects
        .filter(
            service_request=service_request
        )
    )

    quotation_summary = {
        "total": (
            request_quotations.count()
        ),

        "pending": (
            request_quotations
            .filter(status="pending")
            .count()
        ),

        "accepted": (
            request_quotations
            .filter(status="accepted")
            .count()
        ),

        "rejected": (
            request_quotations
            .filter(status="rejected")
            .count()
        ),

        "withdrawn": (
            request_quotations
            .filter(status="withdrawn")
            .count()
        ),
    }

    # =========================================================
    # TRACKING
    # =========================================================

    tracking = (
        build_request_tracking(
            service_request
        )
    )

    # =========================================================
    # AVAILABLE ACTIONS
    # =========================================================

    can_review = (
        booking.status == "completed"
        and not hasattr(
            booking,
            "review",
        )
    )

    can_cancel = (
        booking.status in [
            "accepted",
            "scheduled",
        ]
    )

    # =========================================================
    # COMPLETE BOOKING PAYLOAD
    # =========================================================

    booking_data = (
        serialize_customer_booking(
            booking,
            request,
        )
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Booking details "
                "fetched successfully."
            ),

            "booking": booking_data,

            "accepted_quotation": (
                quotation_data
            ),

            "quotation_summary": (
                quotation_summary
            ),

            "tracking": tracking,

            "available_actions": {
                "can_review": can_review,
                "can_cancel": can_cancel,

                "can_contact_provider": (
                    booking.status
                    in [
                        "accepted",
                        "scheduled",
                        "in_progress",
                    ]
                ),
            },
        },
        status=status.HTTP_200_OK,
    )
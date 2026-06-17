from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import (
    ServiceRequest,
    Booking,
    Quote,
    Review,
    Notification,
    ProviderPortfolio
)

from accounts.models import (
    User,
    CustomerAddress
)

import json

from django.core.paginator import Paginator
from django.db.models import Exists, OuterRef


# =========================================
# HELPERS
# =========================================
VALID_SERVICES = [
    "gardener",
    "electrician",
    "plumber"
]


def is_customer(user):
    return user.role == "customer"


def is_provider(user):
    return user.role in VALID_SERVICES


def is_approved_provider(user):
    return (
        user.role in VALID_SERVICES
        and user.is_active
        and user.is_approved
    )


def get_service_request_or_404(id):

    try:
        return ServiceRequest.objects.get(id=id)

    except ServiceRequest.DoesNotExist:
        return None


def get_quote_or_404(id, service_request):

    if not service_request:
        return None

    try:
        return Quote.objects.get(
            id=id,
            service_request=service_request
        )

    except Quote.DoesNotExist:
        return None


def get_booking_or_404(id):

    try:
        return Booking.objects.get(id=id)

    except Booking.DoesNotExist:
        return None


def service_request_address_text(sr):
    if sr.customer_address_id:
        return sr.customer_address.address
    if isinstance(sr.address, str):
        return sr.address
    return ""


def parse_polygon_points(raw):
    if raw is None or raw == "":
        return None
    if isinstance(raw, (list, dict)):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return None


def provider_profile_payload(user, request=None):

    provider_reviews = Review.objects.filter(
        provider=user
    )

    average_rating = 0

    if provider_reviews.exists():

        total = sum(
            review.rating
            for review in provider_reviews
        )

        average_rating = round(
            total / provider_reviews.count(),
            1
        )

    return {

        "provider_id": user.id,

        "provider": user.username,

        "provider_email": user.email,

        "provider_phone": user.phone,

        "provider_address": user.address,

        "provider_role": user.role,

        "is_verified": user.is_verified,

        "provider_profile_picture": (
            request.build_absolute_uri(
                user.profile_picture.url
            )
            if request and user.profile_picture
            else None
        ),

        "bio": user.bio,

        "experience_years": user.experience_years,

        "portfolio_images": [
            {
                "id": item.id,

                "image": (
                    request.build_absolute_uri(item.image.url)
                    if request and item.image else None
                ),

                "caption": item.caption,
            }
            for item in user.portfolio_images.all().order_by("-created_at")[:5]
        ],

        "average_rating": average_rating,

        "total_reviews": provider_reviews.count(),
    }


# =========================================
# REALTIME NOTIFICATION
# =========================================
def notify(user, title, message):

    Notification.objects.create(
        user=user,
        title=title,
        message=message
    )

    try:

        channel_layer = get_channel_layer()

        if channel_layer is not None:

            async_to_sync(
                channel_layer.group_send
            )(
                f"user_{user.id}",
                {
                    "type": "send_notification",
                    "title": title,
                    "message": message,
                },
            )

    except Exception:
        pass


# =========================================
# CREATE SERVICE REQUEST
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_service_request(request):

    if not is_customer(request.user):

        return Response(
            {
                "success": False,
                "message": "Only customers allowed"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    data = request.data

    service_type = data.get("service_type")
    address_id = data.get("address_id")

    if not service_type or not address_id:

        return Response(
            {
                "success": False,
                "message": "service_type and address_id required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if service_type not in VALID_SERVICES:

        return Response(
            {
                "success": False,
                "message": "Invalid service type"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # =========================================
    # GET CUSTOMER ADDRESS
    # =========================================
    try:
        customer_address = CustomerAddress.objects.get(
            id=address_id,
            customer=request.user,
        )
    except CustomerAddress.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Address not found",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    sr = ServiceRequest.objects.create(
        customer=request.user,
        service_type=service_type,
        customer_address=customer_address,
        address=customer_address.address,
        lat=customer_address.latitude,
        lon=customer_address.longitude,
        lawn_area=data.get("lawn_area"),
        polygon_points=parse_polygon_points(data.get("polygon_points")),
        description=data.get("description"),
        image=request.FILES.get("image"),
        status="pending",
    )

    # =========================================
    # NOTIFY PROVIDERS
    # =========================================
    providers = User.objects.filter(
        role=service_type
    )

    for provider in providers:

        notify(
            provider,
            "New Service Request",
            f"New {service_type} job available"
        )

    return Response(
        {
            "success": True,
            "request_id": sr.id
        },
        status=status.HTTP_201_CREATED
    )


# =========================================
# PROVIDER LEADS
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def provider_leads(request):

    if not is_provider(request.user):

        return Response(
            {
                "success": False,
                "message": "Only providers"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    if not request.user.is_approved:

        return Response(
            {
                "success": False,
                "message": "Your provider account is pending admin approval"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    my_quote = Quote.objects.filter(
        service_request_id=OuterRef("pk"),
        provider_id=request.user.id,
    )

    leads = (
        ServiceRequest.objects.filter(
            service_type=request.user.role,
            is_booked=False,
            selected_provider__isnull=True,
            status="pending"
        )
        .annotate(
            has_quoted=Exists(my_quote)
        )
        .order_by("-created_at")
    )

    return Response({
        "success": True,
        "leads": [
            {
                "id": lead.id,
                "customer": lead.customer.username,
                "customer_id": lead.customer.id,

                "customer_profile_picture": (
                    request.build_absolute_uri(lead.customer.profile_picture.url)
                    if lead.customer.profile_picture else None
                ),

                "address": service_request_address_text(lead),
                "lat": lead.lat,
                "lon": lead.lon,

                "lawn_area": (
                    lead.lawn_area
                    if lead.service_type == "gardener"
                    else None
                ),

                "polygon_points": (
                    lead.polygon_points
                    if lead.service_type == "gardener"
                    else None
                ),

                "description": lead.description,

                "image": (
                    request.build_absolute_uri(lead.image.url)
                    if lead.image else None
                ),

                "status": lead.status if lead.status else "pending",
                "has_quoted": lead.has_quoted,
            }
            for lead in leads
        ]
    })
# =========================================
# SEND QUOTE
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_quote(request):

    if not is_provider(request.user):

        return Response(
            {
                "success": False,
                "message": "Only providers"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    if not request.user.is_approved:

        return Response(
            {
                "success": False,
                "message": "Your provider account is pending admin approval"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    service_request_id = request.data.get(
        "service_request_id"
    )

    price = request.data.get("price")

    sr = get_service_request_or_404(
        service_request_id
    )

    if not sr:

        return Response(
            {
                "success": False,
                "message": "Service request not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # Prevent duplicate quote
    if Quote.objects.filter(
        service_request=sr,
        provider=request.user
    ).exists():

        return Response(
            {
                "success": False,
                "message": "Quote already submitted"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    quote = Quote.objects.create(

        service_request=sr,

        provider=request.user,

        price=price,

        message=request.data.get("message")
    )

    sr.status = "quotation_received"
    sr.save()

    notify(
        sr.customer,
        "New Quote Received",
        f"{request.user.username} sent a quote of ₹{price}"
    )

    return Response(
        {
            "success": True,
            "quote_id": quote.id
        },
        status=status.HTTP_201_CREATED
    )


# =========================================
# VIEW QUOTES
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_quotes(request, request_id):

    sr = get_service_request_or_404(
        request_id
    )

    if not sr:

        return Response(
            {
                "success": False,
                "message": "Service request not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if sr.customer != request.user:

        return Response(
            {
                "success": False,
                "message": "Unauthorized"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    quotes = Quote.objects.filter(
        service_request=sr
    )

    quotes_data = []

    for q in quotes:

        profile = provider_profile_payload(
            q.provider,
            request
        )

        quotes_data.append({
            "id": q.id,
            "price": q.price,
            "message": q.message,
            "status": q.status,
            **profile,
        })

    return Response({
        "success": True,
        "quotes": quotes_data
    })


# =========================================
# SELECT PROVIDER
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def select_provider(request):

    sr = get_service_request_or_404(
        request.data.get("service_request_id")
    )

    if not sr:

        return Response(
            {
                "success": False,
                "message": "Service request not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    quote = get_quote_or_404(
        request.data.get("quote_id"),
        sr
    )

    if not quote:

        return Response(
            {
                "success": False,
                "message": "Quote not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if sr.is_booked:

        return Response(
            {
                "success": False,
                "message": "Already booked"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    booking = Booking.objects.create(
        service_request=sr,
        customer=request.user,
        provider=quote.provider,
        quote=quote,
        final_price=quote.price,
        status="assigned"
    )

    sr.is_booked = True
    sr.status = "assigned"
    sr.selected_provider = quote.provider
    sr.save()

    Quote.objects.filter(
        service_request=sr
    ).exclude(
        id=quote.id
    ).update(
        status="rejected"
    )

    quote.status = "accepted"
    quote.save()

    notify(
        quote.provider,
        "You Got a Job",
        f"You were selected for {sr.service_type}"
    )

    return Response({
        "success": True,
        "booking_id": booking.id,

        "provider": {
            "id": quote.provider.id,
            "username": quote.provider.username,
            "profile_picture": (
                request.build_absolute_uri(quote.provider.profile_picture.url)
                if quote.provider.profile_picture else None
            )
        },

        "customer": {
            "id": request.user.id,
            "username": request.user.username,
            "profile_picture": (
                request.build_absolute_uri(request.user.profile_picture.url)
                if request.user.profile_picture else None
            )
        }
    })


# =========================================
# MY BOOKINGS
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_bookings(request):

    if request.user.role == "customer":

        bookings = Booking.objects.filter(
            customer=request.user
        ).order_by("-created_at")

    else:

        bookings = Booking.objects.filter(
            provider=request.user
        ).order_by("-created_at")

    return Response({
        "success": True,
        "bookings": [
            {
                "id": booking.id,
                "service_type": booking.service_request.service_type,

                "customer": booking.customer.username,
                "customer_id": booking.customer.id,
                "customer_profile_picture": (
                    request.build_absolute_uri(booking.customer.profile_picture.url)
                    if booking.customer.profile_picture else None
                ),

                "provider": booking.provider.username,
                "provider_id": booking.provider.id,
                "provider_profile_picture": (
                    request.build_absolute_uri(booking.provider.profile_picture.url)
                    if booking.provider.profile_picture else None
                ),

                "final_price": booking.final_price,
                "status": booking.status,
                "created_at": booking.created_at,

                "address": service_request_address_text(booking.service_request),
                "lat": booking.service_request.lat,
                "lon": booking.service_request.lon,
                "lawn_area": booking.service_request.lawn_area,
                "polygon_points": booking.service_request.polygon_points,

                "has_review": Review.objects.filter(
                    booking=booking,
                    customer=booking.customer,
                ).exists(),
            }
            for booking in bookings
        ]
    })


# =========================================
# MY REQUESTS
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_requests(request):

    if request.user.role != "customer":

        return Response(
            {
                "success": False,
                "message": "Only customers allowed"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    page = int(
        request.GET.get("page", 1)
    )

    page_size = int(
        request.GET.get("page_size", 10)
    )

    requests_queryset = ServiceRequest.objects.filter(
        customer=request.user
    ).order_by("-created_at")

    paginator = Paginator(
        requests_queryset,
        page_size
    )

    current_page = paginator.get_page(page)

    requests_data = []

    for req in current_page:

        booking = Booking.objects.filter(
            service_request=req
        ).first()

        row = {
            "id": req.id,
            "service_type": req.service_type,
            "address": service_request_address_text(req),
            "lat": req.lat,
            "lon": req.lon,
            "lawn_area": req.lawn_area,
            "polygon_points": req.polygon_points,
            "description": req.description,
            "status": req.status,
            "is_booked": req.is_booked,
            "booking_id": booking.id if booking else None,
            "booking_status": booking.status if booking else None,
            "created_at": req.created_at,

            "customer_id": req.customer.id,
            "customer": req.customer.username,
            "customer_profile_picture": (
                request.build_absolute_uri(req.customer.profile_picture.url)
                if req.customer.profile_picture else None
            ),

            "provider_id": None,
            "provider": None,
            "provider_email": None,
            "provider_phone": None,
            "provider_address": None,
            "provider_profile_picture": None,
            "average_rating": None,
            "total_reviews": None,
        }

        if booking:
            row.update(
                provider_profile_payload(
                    booking.provider,
                    request
                )
            )

        elif req.selected_provider_id:
            row.update(
                provider_profile_payload(
                    req.selected_provider,
                    request
                )
            )

        requests_data.append(row)

    return Response({
        "success": True,
        "page": page,
        "page_size": page_size,
        "total": paginator.count,
        "total_pages": paginator.num_pages,
        "requests": requests_data
    })


# =========================================
# GET NOTIFICATIONS
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_notifications(request):

    notifications = Notification.objects.filter(
        user=request.user
    ).order_by("-created_at")

    unread = notifications.filter(is_read=False).count()

    return Response({
        "success": True,
        "unread_count": unread,
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in notifications
        ],
    })


# =========================================
# MARK NOTIFICATIONS READ
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):

    Notification.objects.filter(
        user=request.user,
        is_read=False,
    ).update(is_read=True)

    return Response({
        "success": True,
        "unread_count": 0,
    })


# =========================================
# UPDATE BOOKING STATUS
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_booking_status(request):

    booking = get_booking_or_404(request.data.get("booking_id"))
    new_status = request.data.get("status")

    if not booking:
        return Response(
            {"success": False, "message": "Booking not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.status in ["completed", "cancelled"]:
        return Response(
            {"success": False, "message": f"Booking already {booking.status}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    allowed = ["assigned", "pending", "in_progress", "completed", "cancelled"]
    if new_status not in allowed:
        return Response(
            {"success": False, "message": "Invalid status"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if booking.provider == request.user:
        booking.status = new_status
        booking.save()
        booking.service_request.status = new_status
        booking.service_request.save()
        notify(booking.customer, "Booking Update", f"Your job is now {new_status}")
        return Response({"success": True, "status": new_status})

    if booking.customer == request.user:
        if new_status != "cancelled":
            return Response(
                {"success": False, "message": "Customers can only cancel bookings"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if booking.status not in ["assigned", "pending"]:
            return Response(
                {"success": False, "message": "Booking cannot be cancelled now"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.status = "cancelled"
        booking.save()
        booking.service_request.status = "cancelled"
        booking.service_request.save()
        notify(
            booking.provider,
            "Booking Cancelled",
            f"{booking.customer.username} cancelled the booking",
        )
        return Response({"success": True, "status": "cancelled"})

    return Response(
        {"success": False, "message": "Unauthorized"},
        status=status.HTTP_403_FORBIDDEN,
    )


# =========================================
# SUBMIT REVIEW
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_review(request):

    booking_id = request.data.get("booking_id")
    provider_id = request.data.get("provider_id")
    rating = request.data.get("rating")

    booking = get_booking_or_404(booking_id)
    if not booking:
        return Response(
            {"success": False, "message": "Booking not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.customer != request.user:
        return Response(
            {"success": False, "message": "Only customer can submit review"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if booking.status != "completed":
        return Response(
            {"success": False, "message": "Review allowed only after completion"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if int(provider_id) != booking.provider.id:
        return Response(
            {"success": False, "message": "Invalid provider"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if Review.objects.filter(booking=booking, customer=request.user).exists():
        return Response(
            {"success": False, "message": "Review already submitted"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            raise ValueError
    except (TypeError, ValueError):
        return Response(
            {"success": False, "message": "Rating must be between 1 and 5"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    review = Review.objects.create(
        booking=booking,
        customer=request.user,
        provider=booking.provider,
        rating=rating,
        review=request.data.get("review"),
    )

    try:
        notify(
            booking.provider,
            "New Review",
            f"You received {review.rating} stars",
        )
    except Exception:
        pass

    return Response(
        {"success": True, "review_id": review.id},
        status=status.HTTP_201_CREATED,
    )


# =========================================
# GET PROFILE
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_profile(request):

    user = request.user

    return Response({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "phone": user.phone,
            "address": user.address,
            "profile_picture": (
                request.build_absolute_uri(user.profile_picture.url)
                if user.profile_picture else None
            ),
        },
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_profile(request):

    user = request.user

    username = request.data.get("username")
    email = request.data.get("email")
    phone = request.data.get("phone")
    address = request.data.get("address")
    service_type = request.data.get("service_type")
    bio = request.data.get("bio")
    experience_years = request.data.get("experience_years")
    profile_picture = request.FILES.get("profile_picture")

    if username:
        user.username = username

    if email:
        user.email = email

    if phone is not None:
        user.phone = phone

    if address is not None:
        user.address = address

    if bio is not None:
        user.bio = bio

    if experience_years is not None:
        user.experience_years = experience_years

    if profile_picture:
        user.profile_picture = profile_picture

    if service_type:
        if user.role == "customer":
            return Response(
                {"success": False, "message": "Customers cannot update service type"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if service_type not in VALID_SERVICES:
            return Response(
                {"success": False, "message": "Invalid service type"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.role = service_type

    user.save()

    return Response({
        "success": True,
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "phone": user.phone,
            "address": user.address,
            "bio": user.bio,
            "experience_years": user.experience_years,
            "profile_picture": (
                request.build_absolute_uri(user.profile_picture.url)
                if user.profile_picture else None
            ),
        },
    })


# =========================================
# VIEW SPECIFIC LEAD / REQUEST
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_lead_detail(request, request_id):

    service_request = get_service_request_or_404(request_id)

    if not service_request:
        return Response(
            {
                "success": False,
                "message": "Service request not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if request.user.role == "customer":

        if service_request.customer != request.user:
            return Response(
                {
                    "success": False,
                    "message": "Unauthorized"
                },
                status=status.HTTP_403_FORBIDDEN
            )

    elif request.user.role in VALID_SERVICES:

        if service_request.service_type != request.user.role:
            return Response(
                {
                    "success": False,
                    "message": "Unauthorized"
                },
                status=status.HTTP_403_FORBIDDEN
            )

    else:
        return Response(
            {
                "success": False,
                "message": "Unauthorized"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    my_quote = None

    if request.user.role in VALID_SERVICES:
        my_quote = Quote.objects.filter(
            service_request=service_request,
            provider=request.user
        ).first()

    return Response({
        "success": True,
        "lead": {
            "id": service_request.id,

            "customer_id": service_request.customer.id,
            "customer": service_request.customer.username,
            "customer_profile_picture": (
                request.build_absolute_uri(service_request.customer.profile_picture.url)
                if service_request.customer.profile_picture else None
            ),

            "service_type": service_request.service_type,
            "address": service_request_address_text(service_request),
            "lat": service_request.lat,
            "lon": service_request.lon,

            "lawn_area": (
                service_request.lawn_area
                if service_request.service_type == "gardener"
                else None
            ),

            "polygon_points": (
                service_request.polygon_points
                if service_request.service_type == "gardener"
                else None
            ),

            "description": service_request.description,

            "image": (
                request.build_absolute_uri(service_request.image.url)
                if service_request.image else None
            ),

            "status": service_request.status,
            "is_booked": service_request.is_booked,
            "created_at": service_request.created_at,
            "has_quoted": my_quote is not None,

            "my_quote": {
                "id": my_quote.id,
                "price": my_quote.price,
                "message": my_quote.message,
                "status": my_quote.status
            } if my_quote else None
        }
    })
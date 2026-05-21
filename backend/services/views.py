from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import ServiceRequest, Booking, Quote, Review, Notification
from accounts.models import User


# ==============================
# HELPERS
# ==============================
VALID_SERVICES = ["gardener", "electrician", "plumber"]
VALID_ROLES = VALID_SERVICES


def is_customer(user):
    return user.role == "customer"


def is_provider(user):
    return user.role in VALID_ROLES


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


# ==============================
# REALTIME NOTIFICATION
# ==============================
def notify(user, title, message):

    # Save notification in DB
    Notification.objects.create(
        user=user,
        title=title,
        message=message
    )

    # Send realtime websocket notification
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f"user_{user.id}",
        {
            "type": "send_notification",
            "title": title,
            "message": message
        }
    )


# ==============================
# CREATE SERVICE REQUEST
# ==============================
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
    address = data.get("address")

    if not service_type or not address:
        return Response(
            {
                "success": False,
                "message": "Missing fields"
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

    sr = ServiceRequest.objects.create(
        customer=request.user,
        service_type=service_type,
        address=address,
        lat=data.get("lat"),
        lon=data.get("lon"),
        lawn_area=data.get("lawn_area"),
        description=data.get("description"),
        image=request.FILES.get("image"),
        status="pending"
    )

    # Notify all providers
    providers = User.objects.filter(role=service_type)

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


# ==============================
# PROVIDER LEADS
# ==============================
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

    leads = ServiceRequest.objects.filter(
        service_type=request.user.role,
        is_booked=False
    ).order_by("-created_at")

    return Response({
        "success": True,
        "leads": [
            {
                "id": lead.id,
                "customer": lead.customer.username,
                "address": lead.address,
                "lat": lead.lat,
                "lon": lead.lon,
                "area": lead.lawn_area,
                "description": lead.description,
                "image": lead.image.url if lead.image else None,
                "status": lead.status,
            }
            for lead in leads
        ]
    })


# ==============================
# SEND QUOTE
# ==============================
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

    service_request_id = request.data.get("service_request_id")
    price = request.data.get("price")

    sr = get_service_request_or_404(service_request_id)

    if not sr:
        return Response(
            {
                "success": False,
                "message": "Service request not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    quote = Quote.objects.create(
        service_request=sr,
        provider=request.user,
        price=price,
        message=request.data.get("message")
    )

    sr.status = "quotation_received"
    sr.save()

    # Notify customer
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


# ==============================
# VIEW QUOTES
# ==============================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_quotes(request, request_id):

    sr = get_service_request_or_404(request_id)

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

    quotes = Quote.objects.filter(service_request=sr)

    return Response({
        "success": True,
        "quotes": [
            {
                "id": q.id,
                "provider": q.provider.username,
                "price": q.price,
                "message": q.message,
                "status": q.status
            }
            for q in quotes
        ]
    })


# ==============================
# SELECT PROVIDER
# ==============================
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

    # Notify provider
    notify(
        quote.provider,
        "You Got a Job",
        f"You were selected for {sr.service_type}"
    )

    # Notify customer
    notify(
        request.user,
        "Booking Confirmed",
        f"You selected {quote.provider.username}"
    )

    return Response({
        "success": True,
        "booking_id": booking.id
    })


# ==============================
# MY BOOKINGS
# ==============================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_bookings(request):

    if request.user.role == "customer":
        bookings = Booking.objects.filter(
            customer=request.user
        )
    else:
        bookings = Booking.objects.filter(
            provider=request.user
        )

    return Response({
        "success": True,
        "bookings": [
            {
                "id": booking.id,
                "service_type": booking.service_request.service_type,
                "customer": booking.customer.username,
                "provider": booking.provider.username,
                "final_price": booking.final_price,
                "status": booking.status,
                "created_at": booking.created_at
            }
            for booking in bookings
        ]
    })


# ==============================
# UPDATE BOOKING STATUS
# ==============================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_booking_status(request):

    booking = get_booking_or_404(
        request.data.get("booking_id")
    )

    new_status = request.data.get("status")

    if not booking:
        return Response(
            {
                "success": False,
                "message": "Booking not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    allowed = [
        "assigned",
        "in_progress",
        "completed",
        "cancelled"
    ]

    if new_status not in allowed:
        return Response(
            {
                "success": False,
                "message": "Invalid status"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if booking.provider != request.user:
        return Response(
            {
                "success": False,
                "message": "Unauthorized"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    booking.status = new_status
    booking.save()

    booking.service_request.status = new_status
    booking.service_request.save()

    # Notify customer
    notify(
        booking.customer,
        "Booking Update",
        f"Your job is now {new_status}"
    )

    return Response({
        "success": True,
        "status": new_status
    })


# ==============================
# SUBMIT REVIEW
# ==============================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_review(request):

    booking_id = request.data.get("booking_id")
    provider_id = request.data.get("provider_id")

    booking = get_booking_or_404(booking_id)

    if not booking:
        return Response(
            {"success": False, "message": "Booking not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        provider = User.objects.get(id=provider_id)
    except User.DoesNotExist:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    review = Review.objects.create(
        booking=booking,
        customer=request.user,
        provider=provider,
        rating=request.data.get("rating"),
        review=request.data.get("review")
    )

    notify(
        provider,
        "New Review",
        f"You received {review.rating} stars"
    )

    return Response({
        "success": True,
        "review_id": review.id
    }, status=status.HTTP_201_CREATED)
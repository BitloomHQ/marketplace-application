from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from accounts.models import User
from accounts.helpers import is_provider_role, provider_role_keys
from services.models import ServiceRequest, Quote, Booking, Review
from .models import ServiceCategory

PROVIDER_ROLES = provider_role_keys()


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_dashboard(request):

    return Response({
        "success": True,
        "data": {
            "users": {
                "total_customers": User.objects.filter(role="customer").count(),
                "active_customers": User.objects.filter(role="customer", is_active=True).count(),
                "inactive_customers": User.objects.filter(role="customer", is_active=False).count(),

                "total_providers": User.objects.filter(role__in=PROVIDER_ROLES).count(),
                "active_providers": User.objects.filter(role__in=PROVIDER_ROLES, is_active=True).count(),
                "inactive_providers": User.objects.filter(role__in=PROVIDER_ROLES, is_active=False).count(),
                "pending_providers": User.objects.filter(role__in=PROVIDER_ROLES, is_approved=False).count(),
                "approved_providers": User.objects.filter(role__in=PROVIDER_ROLES, is_approved=True).count(),
                "verified_providers": User.objects.filter(role__in=PROVIDER_ROLES, is_verified=True).count(),
            },

            "services": {
                "total_services": ServiceCategory.objects.count(),
                "active_services": ServiceCategory.objects.filter(status="active").count(),
                "coming_soon_services": ServiceCategory.objects.filter(status="coming_soon").count(),
                "inactive_services": ServiceCategory.objects.filter(status="inactive").count(),
            },

            "marketplace": {
                "total_requests": ServiceRequest.objects.count(),
                "total_quotes": Quote.objects.count(),
                "total_bookings": Booking.objects.count(),
                "completed_bookings": Booking.objects.filter(status="completed").count(),
                "cancelled_bookings": Booking.objects.filter(status="cancelled").count(),
                "total_reviews": Review.objects.count(),
            }
        }
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def pending_providers(request):

    providers = User.objects.filter(
        role__in=PROVIDER_ROLES,
        is_approved=False
    ).order_by("-date_joined")

    return Response({
        "success": True,
        "providers": [
            {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "phone": provider.phone,
                "address": provider.address,
                "role": provider.role,
                "bio": provider.bio,
                "experience_years": provider.experience_years,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "profile_picture": (
                    request.build_absolute_uri(provider.profile_picture.url)
                    if provider.profile_picture else None
                ),
                "date_joined": provider.date_joined,
            }
            for provider in providers
        ]
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def approve_provider(request, provider_id):

    provider = User.objects.filter(
        id=provider_id,
        role__in=PROVIDER_ROLES
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_approved = True
    provider.is_verified = True
    provider.is_active = True
    provider.status_note = ''
    provider.save()

    return Response({
        "success": True,
        "message": "Provider approved successfully"
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def reject_provider(request, provider_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider = User.objects.filter(
        id=provider_id,
        role__in=PROVIDER_ROLES
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_approved = False
    provider.is_verified = False
    provider.is_active = False
    provider.status_note = reason
    provider.save()

    return Response({
        "success": True,
        "message": "Provider rejected successfully",
        "reason": reason,
    })

@api_view(["GET"])
@permission_classes([IsAdminUser])
def service_categories(request):

    services = ServiceCategory.objects.all().order_by(
        "display_order",
        "id"
    )

    return Response({
        "success": True,
        "services": [
            {
                "id": service.id,
                "name": service.name,
                "key": service.key,
                "description": service.description,
                "service_image": (
                    request.build_absolute_uri(service.service_image.url)
                    if service.service_image else None
                ),
                "status": service.status,
                "start_date": service.start_date,
                "display_order": service.display_order,
            }
            for service in services
        ]
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def create_service_category(request):

    name = request.data.get("name")
    key = request.data.get("key")
    description = request.data.get("description")
    service_image = request.FILES.get("service_image")

    if not name or not key or not description:
        return Response(
            {
                "success": False,
                "message": "name, key and description are required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if ServiceCategory.objects.filter(key=key).exists():
        return Response(
            {
                "success": False,
                "message": "Service key already exists"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    service = ServiceCategory.objects.create(
        name=name,
        key=key,
        description=description,
        service_image=service_image,
        status=request.data.get("status", "coming_soon"),
        start_date=request.data.get("start_date", "Yet to start"),
        display_order=request.data.get("display_order", 0),
    )

    return Response({
        "success": True,
        "message": "Service category created successfully",
        "service_id": service.id,
        "service_image": (
            request.build_absolute_uri(service.service_image.url)
            if service.service_image else None
        )
    }, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def update_service_category(request, service_id):

    service = ServiceCategory.objects.filter(
        id=service_id
    ).first()

    if not service:
        return Response(
            {
                "success": False,
                "message": "Service not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    service.name = request.data.get("name", service.name)
    service.description = request.data.get("description", service.description)
    service.status = request.data.get("status", service.status)
    service.start_date = request.data.get("start_date", service.start_date)
    service.display_order = request.data.get(
        "display_order",
        service.display_order
    )

    service_image = request.FILES.get("service_image")

    if service_image:
        service.service_image = service_image

    service.save()

    return Response({
        "success": True,
        "message": "Service category updated successfully",
        "service": {
            "id": service.id,
            "name": service.name,
            "key": service.key,
            "description": service.description,
            "service_image": (
                request.build_absolute_uri(service.service_image.url)
                if service.service_image else None
            ),
            "status": service.status,
            "start_date": service.start_date,
            "display_order": service.display_order,
        }
    })


@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def delete_service_category(request, service_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Delete reason is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    service = ServiceCategory.objects.filter(
        id=service_id
    ).first()

    if not service:
        return Response(
            {
                "success": False,
                "message": "Service not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    service_name = service.name
    service_key = service.key

    service.delete()

    return Response({
        "success": True,
        "message": "Service category deleted successfully",
        "deleted_service": {
            "name": service_name,
            "key": service_key,
            "reason": reason
        }
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_providers(request):

    providers = User.objects.filter(
        role__in=PROVIDER_ROLES
    ).order_by("-date_joined")

    return Response({
        "success": True,
        "providers": [
            {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "phone": provider.phone,
                "address": provider.address,
                "role": provider.role,
                "bio": provider.bio,
                "experience_years": provider.experience_years,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "is_active": provider.is_active,
                "status_note": provider.status_note or "",
                "profile_picture": (
                    request.build_absolute_uri(provider.profile_picture.url)
                    if provider.profile_picture else None
                ),
                "date_joined": provider.date_joined,
            }
            for provider in providers
        ]
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def activate_provider(request, provider_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    provider = User.objects.filter(
        id=provider_id,
        role__in=PROVIDER_ROLES
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_active = True
    provider.deactivate_reason = None
    provider.status_note = ''
    provider.save()

    return Response({
        "success": True,
        "message": "Provider activated successfully",
        "reason": reason
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def deactivate_provider(request, provider_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    provider = User.objects.filter(
        id=provider_id,
        role__in=PROVIDER_ROLES
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_active = False
    provider.deactivate_reason = reason
    provider.save()

    return Response({
        "success": True,
        "message": "Provider deactivated successfully",
        "reason": reason
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def verify_provider(request, provider_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    provider = User.objects.filter(
        id=provider_id,
        role__in=PROVIDER_ROLES
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_verified = True
    provider.is_approved = True
    provider.is_active = True
    provider.status_note = ''
    provider.save()

    return Response({
        "success": True,
        "message": "Provider verified successfully",
        "reason": reason
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def unverify_provider(request, provider_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    provider = User.objects.filter(
        id=provider_id,
        role__in=PROVIDER_ROLES
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_verified = False
    provider.save()

    return Response({
        "success": True,
        "message": "Provider unverified successfully",
        "reason": reason
    })

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_customers(request):

    customers = User.objects.filter(
        role="customer"
    ).order_by("-date_joined")

    return Response({
        "success": True,
        "customers": [
            {
                "id": customer.id,
                "username": customer.username,
                "email": customer.email,
                "phone": customer.phone,
                "address": customer.address,
                "is_active": customer.is_active,
                "date_joined": customer.date_joined,
                "profile_picture": (
                    request.build_absolute_uri(customer.profile_picture.url)
                    if customer.profile_picture else None
                ),
            }
            for customer in customers
        ]
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def activate_customer(request, customer_id):

    customer = User.objects.filter(
        id=customer_id,
        role="customer"
    ).first()

    if not customer:
        return Response(
            {"success": False, "message": "Customer not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    customer.is_active = True
    customer.is_approved = True
    customer.save()

    return Response({
        "success": True,
        "message": "Customer activated successfully"
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def deactivate_customer(request, customer_id):

    customer = User.objects.filter(
        id=customer_id,
        role="customer"
    ).first()

    if not customer:
        return Response(
            {"success": False, "message": "Customer not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    customer.is_active = False
    customer.save()

    return Response({
        "success": True,
        "message": "Customer deactivated successfully"
    })

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_service_requests(request):

    requests = ServiceRequest.objects.all().order_by("-created_at")

    return Response({
        "success": True,
        "requests": [
            {
                "id": item.id,
                "customer_id": item.customer.id,
                "customer": item.customer.username,
                "service_type": item.service_type,
                "address": item.customer_address.address if item.customer_address else item.address,
                "lat": item.lat,
                "lon": item.lon,
                "description": item.description,
                "status": item.status,
                "is_booked": item.is_booked,
                "selected_provider": item.selected_provider.username if item.selected_provider else None,
                "created_at": item.created_at,
            }
            for item in requests
        ]
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_bookings(request):

    bookings = Booking.objects.all().order_by("-created_at")

    return Response({
        "success": True,
        "bookings": [
            {
                "id": booking.id,
                "service_request_id": booking.service_request.id,
                "service_type": booking.service_request.service_type,
                "customer_id": booking.customer.id,
                "customer": booking.customer.username,
                "provider_id": booking.provider.id,
                "provider": booking.provider.username,
                "final_price": booking.final_price,
                "status": booking.status,
                "created_at": booking.created_at,
                "updated_at": booking.updated_at,
            }
            for booking in bookings
        ]
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_quotes(request):

    quotes = Quote.objects.all().order_by("-created_at")

    return Response({
        "success": True,
        "quotes": [
            {
                "id": quote.id,
                "service_request_id": quote.service_request.id,
                "service_type": quote.service_request.service_type,
                "customer": quote.service_request.customer.username,
                "provider_id": quote.provider.id,
                "provider": quote.provider.username,
                "price": quote.price,
                "message": quote.message,
                "status": quote.status,
                "created_at": quote.created_at,
            }
            for quote in quotes
        ]
    })

@api_view(["GET"])
@permission_classes([IsAdminUser])
def provider_performance(request):

    providers = User.objects.filter(
        role__in=PROVIDER_ROLES
    ).order_by("username")

    data = []

    for provider in providers:

        total_quotes = Quote.objects.filter(
            provider=provider
        ).count()

        accepted_quotes = Quote.objects.filter(
            provider=provider,
            status="accepted"
        ).count()

        total_bookings = Booking.objects.filter(
            provider=provider
        ).count()

        completed_bookings = Booking.objects.filter(
            provider=provider,
            status="completed"
        ).count()

        cancelled_bookings = Booking.objects.filter(
            provider=provider,
            status="cancelled"
        ).count()

        reviews = Review.objects.filter(
            provider=provider
        )

        average_rating = 0

        if reviews.exists():
            total_rating = sum(review.rating for review in reviews)
            average_rating = round(total_rating / reviews.count(), 1)

        acceptance_rate = 0
        if total_quotes > 0:
            acceptance_rate = round((accepted_quotes / total_quotes) * 100, 2)

        completion_rate = 0
        if total_bookings > 0:
            completion_rate = round((completed_bookings / total_bookings) * 100, 2)

        data.append({
            "provider_id": provider.id,
            "provider": provider.username,
            "email": provider.email,
            "phone": provider.phone,
            "role": provider.role,
            "is_active": provider.is_active,
            "is_approved": provider.is_approved,
            "is_verified": provider.is_verified,
            "profile_picture": (
                request.build_absolute_uri(provider.profile_picture.url)
                if provider.profile_picture else None
            ),
            "total_quotes": total_quotes,
            "accepted_quotes": accepted_quotes,
            "acceptance_rate": acceptance_rate,
            "total_bookings": total_bookings,
            "completed_bookings": completed_bookings,
            "cancelled_bookings": cancelled_bookings,
            "completion_rate": completion_rate,
            "total_reviews": reviews.count(),
            "average_rating": average_rating,
        })

    return Response({
        "success": True,
        "providers": data
    })

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_providers(request):

    providers = User.objects.filter(
        role__in=PROVIDER_ROLES
    ).order_by("-date_joined")

    return Response({
        "success": True,
        "providers": [
            {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "phone": provider.phone,
                "address": provider.address,
                "role": provider.role,
                "bio": provider.bio,
                "experience_years": provider.experience_years,
                "is_active": provider.is_active,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "deactivate_reason": provider.deactivate_reason,
                "profile_picture": (
                    request.build_absolute_uri(provider.profile_picture.url)
                    if provider.profile_picture else None
                ),
                "date_joined": provider.date_joined,
            }
            for provider in providers
        ]
    })    
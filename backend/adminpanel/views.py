from django.db.models import Avg
from django.utils.text import slugify

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from accounts.helpers import provider_role_keys
from accounts.models import User
from service_requests.models import CustomerServiceRequest
from services.models import (
    Booking,
    Quote,
    Review,
    ServiceCategory,
)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_absolute_file_url(request, file_field):
    """
    Return the absolute URL of a file/image field.

    Returns None when no file is available.
    """
    if not file_field:
        return None

    try:
        return request.build_absolute_uri(file_field.url)
    except (ValueError, AttributeError):
        return None


def generate_unique_service_slug(name, service_id=None):
    """
    Generate a unique slug for a ServiceCategory.

    service_id is used during update so the current service
    is excluded from duplicate checking.
    """
    base_slug = slugify(name)

    if not base_slug:
        base_slug = "service"

    slug = base_slug
    counter = 1

    queryset = ServiceCategory.objects.all()

    if service_id is not None:
        queryset = queryset.exclude(id=service_id)

    while queryset.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug


def parse_display_order(value, default=0):
    """
    Convert display_order into an integer.

    Returns default when no value is supplied.
    Raises ValueError when an invalid value is supplied.
    """
    if value in (None, ""):
        return default

    return int(value)


# ============================================================
# ADMIN DASHBOARD
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_dashboard(request):
    provider_roles = provider_role_keys()

    total_customers = User.objects.filter(
        role="customer"
    ).count()

    active_customers = User.objects.filter(
        role="customer",
        is_active=True,
    ).count()

    inactive_customers = User.objects.filter(
        role="customer",
        is_active=False,
    ).count()

    total_providers = User.objects.filter(
        role__in=provider_roles,
    ).count()

    active_providers = User.objects.filter(
        role__in=provider_roles,
        is_active=True,
    ).count()

    inactive_providers = User.objects.filter(
        role__in=provider_roles,
        is_active=False,
    ).count()

    pending_providers_count = User.objects.filter(
        role__in=provider_roles,
        is_approved=False,
    ).count()

    approved_providers_count = User.objects.filter(
        role__in=provider_roles,
        is_approved=True,
    ).count()

    verified_providers_count = User.objects.filter(
        role__in=provider_roles,
        is_verified=True,
    ).count()

    return Response(
        {
            "success": True,
            "data": {
                "users": {
                    "total_customers": total_customers,
                    "active_customers": active_customers,
                    "inactive_customers": inactive_customers,
                    "total_providers": total_providers,
                    "active_providers": active_providers,
                    "inactive_providers": inactive_providers,
                    "pending_providers": pending_providers_count,
                    "approved_providers": approved_providers_count,
                    "verified_providers": verified_providers_count,
                },
                "services": {
                    "total_services": (
                        ServiceCategory.objects.count()
                    ),
                    "active_services": (
                        ServiceCategory.objects.filter(
                            status="active"
                        ).count()
                    ),
                    "coming_soon_services": (
                        ServiceCategory.objects.filter(
                            status="coming_soon"
                        ).count()
                    ),
                    "inactive_services": (
                        ServiceCategory.objects.filter(
                            status="inactive"
                        ).count()
                    ),
                },
                "marketplace": {
                    "total_requests": (
                        CustomerServiceRequest.objects.count()
                    ),
                    "total_quotes": Quote.objects.count(),
                    "total_bookings": Booking.objects.count(),
                    "completed_bookings": (
                        Booking.objects.filter(
                            status="completed"
                        ).count()
                    ),
                    "cancelled_bookings": (
                        Booking.objects.filter(
                            status="cancelled"
                        ).count()
                    ),
                    "total_reviews": Review.objects.count(),
                },
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# PENDING PROVIDERS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def pending_providers(request):
    provider_roles = provider_role_keys()

    providers = User.objects.filter(
        role__in=provider_roles,
        is_approved=False,
    ).order_by("-date_joined")

    provider_data = []

    for provider in providers:
        provider_data.append(
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
                "status_note": provider.status_note,
                "deactivate_reason": provider.deactivate_reason,
                "profile_picture": get_absolute_file_url(
                    request,
                    provider.profile_picture,
                ),
                "date_joined": provider.date_joined,
            }
        )

    return Response(
        {
            "success": True,
            "count": len(provider_data),
            "providers": provider_data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# APPROVE PROVIDER
# ============================================================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def approve_provider(request, provider_id):
    provider_roles = provider_role_keys()

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_roles,
    ).first()

    if not provider:
        return Response(
            {
                "success": False,
                "message": "Provider not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    provider.is_approved = True
    provider.is_verified = True
    provider.is_active = True
    provider.status_note = ""
    provider.deactivate_reason = None

    provider.save(
        update_fields=[
            "is_approved",
            "is_verified",
            "is_active",
            "status_note",
            "deactivate_reason",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Provider approved successfully.",
            "provider": {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "role": provider.role,
                "is_active": provider.is_active,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# REJECT PROVIDER
# ============================================================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def reject_provider(request, provider_id):
    reason = str(
        request.data.get("reason", "")
    ).strip()

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider_roles = provider_role_keys()

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_roles,
    ).first()

    if not provider:
        return Response(
            {
                "success": False,
                "message": "Provider not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    provider.is_approved = False
    provider.is_verified = False
    provider.is_active = False
    provider.status_note = reason
    provider.deactivate_reason = reason

    provider.save(
        update_fields=[
            "is_approved",
            "is_verified",
            "is_active",
            "status_note",
            "deactivate_reason",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Provider rejected successfully.",
            "reason": reason,
            "provider": {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "role": provider.role,
                "is_active": provider.is_active,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "status_note": provider.status_note,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# SERVICE CATEGORY LIST
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def service_categories(request):
    services = ServiceCategory.objects.select_related(
        "parent"
    ).order_by(
        "display_order",
        "id",
    )

    service_data = []

    for service in services:
        service_data.append(
            {
                "id": service.id,
                "name": service.name,
                "slug": service.slug,
                "key": service.key,
                "description": service.description,
                "icon": get_absolute_file_url(
                    request,
                    service.icon,
                ),
                "parent": (
                    {
                        "id": service.parent.id,
                        "name": service.parent.name,
                        "slug": service.parent.slug,
                        "key": service.parent.key,
                    }
                    if service.parent
                    else None
                ),
                "status": service.status,
                "start_date": service.start_date,
                "display_order": service.display_order,
                "created_at": service.created_at,
                "updated_at": service.updated_at,
            }
        )

    return Response(
        {
            "success": True,
            "count": len(service_data),
            "services": service_data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CREATE SERVICE CATEGORY
# ============================================================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def create_service_category(request):
    name = str(
        request.data.get("name", "")
    ).strip()

    key = str(
        request.data.get("key", "")
    ).strip().lower()

    description = str(
        request.data.get("description", "")
    ).strip()

    requested_slug = str(
        request.data.get("slug", "")
    ).strip()

    icon = (
        request.FILES.get("icon")
        or request.FILES.get("service_image")
    )

    service_status = request.data.get(
        "status",
        "coming_soon",
    )

    start_date = request.data.get("start_date")
    parent_id = request.data.get("parent_id")

    if not name:
        return Response(
            {
                "success": False,
                "message": "Service name is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not key:
        return Response(
            {
                "success": False,
                "message": "Service key is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not description:
        return Response(
            {
                "success": False,
                "message": "Service description is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if ServiceCategory.objects.filter(
        key__iexact=key
    ).exists():
        return Response(
            {
                "success": False,
                "message": "Service key already exists.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if requested_slug:
        service_slug = slugify(requested_slug)

        if not service_slug:
            return Response(
                {
                    "success": False,
                    "message": "A valid slug is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ServiceCategory.objects.filter(
            slug=service_slug
        ).exists():
            return Response(
                {
                    "success": False,
                    "message": "Service slug already exists.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        service_slug = generate_unique_service_slug(name)

    valid_statuses = {
        choice[0]
        for choice in ServiceCategory.STATUS_CHOICES
    } if hasattr(
        ServiceCategory,
        "STATUS_CHOICES",
    ) else {
        "active",
        "coming_soon",
        "inactive",
    }

    if service_status not in valid_statuses:
        return Response(
            {
                "success": False,
                "message": "Invalid service status.",
                "allowed_statuses": list(valid_statuses),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        display_order = parse_display_order(
            request.data.get("display_order"),
            default=0,
        )
    except (TypeError, ValueError):
        return Response(
            {
                "success": False,
                "message": "display_order must be an integer.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    parent = None

    if parent_id:
        parent = ServiceCategory.objects.filter(
            id=parent_id
        ).first()

        if not parent:
            return Response(
                {
                    "success": False,
                    "message": "Parent service category not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

    service = ServiceCategory.objects.create(
        name=name,
        slug=service_slug,
        key=key,
        description=description,
        icon=icon,
        parent=parent,
        status=service_status,
        start_date=start_date,
        display_order=display_order,
    )

    return Response(
        {
            "success": True,
            "message": "Service category created successfully.",
            "service": {
                "id": service.id,
                "name": service.name,
                "slug": service.slug,
                "key": service.key,
                "description": service.description,
                "icon": get_absolute_file_url(
                    request,
                    service.icon,
                ),
                "parent_id": (
                    service.parent.id
                    if service.parent
                    else None
                ),
                "status": service.status,
                "start_date": service.start_date,
                "display_order": service.display_order,
                "created_at": service.created_at,
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# UPDATE SERVICE CATEGORY
# ============================================================

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
                "message": "Service category not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if "name" in request.data:
        name = str(
            request.data.get("name", "")
        ).strip()

        if not name:
            return Response(
                {
                    "success": False,
                    "message": "Service name cannot be empty.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        service.name = name

    if "key" in request.data:
        key = str(
            request.data.get("key", "")
        ).strip().lower()

        if not key:
            return Response(
                {
                    "success": False,
                    "message": "Service key cannot be empty.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        key_exists = ServiceCategory.objects.exclude(
            id=service.id
        ).filter(
            key__iexact=key
        ).exists()

        if key_exists:
            return Response(
                {
                    "success": False,
                    "message": "Service key already exists.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        service.key = key

    if "slug" in request.data:
        requested_slug = slugify(
            str(request.data.get("slug", "")).strip()
        )

        if not requested_slug:
            return Response(
                {
                    "success": False,
                    "message": "A valid slug is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        slug_exists = ServiceCategory.objects.exclude(
            id=service.id
        ).filter(
            slug=requested_slug
        ).exists()

        if slug_exists:
            return Response(
                {
                    "success": False,
                    "message": "Service slug already exists.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        service.slug = requested_slug

    elif "name" in request.data:
        service.slug = generate_unique_service_slug(
            service.name,
            service_id=service.id,
        )

    if "description" in request.data:
        description = str(
            request.data.get("description", "")
        ).strip()

        if not description:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Service description cannot be empty."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        service.description = description

    if "status" in request.data:
        service_status = request.data.get("status")

        valid_statuses = {
            choice[0]
            for choice in ServiceCategory.STATUS_CHOICES
        } if hasattr(
            ServiceCategory,
            "STATUS_CHOICES",
        ) else {
            "active",
            "coming_soon",
            "inactive",
        }

        if service_status not in valid_statuses:
            return Response(
                {
                    "success": False,
                    "message": "Invalid service status.",
                    "allowed_statuses": list(valid_statuses),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        service.status = service_status

    if "start_date" in request.data:
        service.start_date = request.data.get(
            "start_date"
        )

    if "display_order" in request.data:
        try:
            service.display_order = parse_display_order(
                request.data.get("display_order"),
                default=service.display_order,
            )
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": (
                        "display_order must be an integer."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    if "parent_id" in request.data:
        parent_id = request.data.get("parent_id")

        if parent_id in (None, "", "null"):
            service.parent = None
        else:
            parent = ServiceCategory.objects.filter(
                id=parent_id
            ).first()

            if not parent:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Parent service category not found."
                        ),
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            if parent.id == service.id:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "A service category cannot be its own parent."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service.parent = parent

    icon = (
        request.FILES.get("icon")
        or request.FILES.get("service_image")
    )

    if icon:
        service.icon = icon

    service.save()

    return Response(
        {
            "success": True,
            "message": "Service category updated successfully.",
            "service": {
                "id": service.id,
                "name": service.name,
                "slug": service.slug,
                "key": service.key,
                "description": service.description,
                "icon": get_absolute_file_url(
                    request,
                    service.icon,
                ),
                "parent": (
                    {
                        "id": service.parent.id,
                        "name": service.parent.name,
                    }
                    if service.parent
                    else None
                ),
                "status": service.status,
                "start_date": service.start_date,
                "display_order": service.display_order,
                "updated_at": service.updated_at,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE SERVICE CATEGORY
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def delete_service_category(request, service_id):
    reason = str(
        request.data.get("reason", "")
    ).strip()

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Delete reason is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    service = ServiceCategory.objects.filter(
        id=service_id
    ).first()

    if not service:
        return Response(
            {
                "success": False,
                "message": "Service category not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    service_data = {
        "id": service.id,
        "name": service.name,
        "slug": service.slug,
        "key": service.key,
        "reason": reason,
    }

    service.delete()

    return Response(
        {
            "success": True,
            "message": "Service category deleted successfully.",
            "deleted_service": service_data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# ACTIVATE PROVIDER
# ============================================================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def activate_provider(request, provider_id):
    reason = str(
        request.data.get("reason", "")
    ).strip()

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider_roles = provider_role_keys()

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_roles,
    ).first()

    if not provider:
        return Response(
            {
                "success": False,
                "message": "Provider not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    provider.is_active = True
    provider.deactivate_reason = None
    provider.status_note = ""

    provider.save(
        update_fields=[
            "is_active",
            "deactivate_reason",
            "status_note",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Provider activated successfully.",
            "reason": reason,
            "provider": {
                "id": provider.id,
                "username": provider.username,
                "is_active": provider.is_active,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DEACTIVATE PROVIDER
# ============================================================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def deactivate_provider(request, provider_id):
    reason = str(
        request.data.get("reason", "")
    ).strip()

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider_roles = provider_role_keys()

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_roles,
    ).first()

    if not provider:
        return Response(
            {
                "success": False,
                "message": "Provider not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    provider.is_active = False
    provider.deactivate_reason = reason
    provider.status_note = reason

    provider.save(
        update_fields=[
            "is_active",
            "deactivate_reason",
            "status_note",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Provider deactivated successfully.",
            "reason": reason,
            "provider": {
                "id": provider.id,
                "username": provider.username,
                "is_active": provider.is_active,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# VERIFY PROVIDER
# ============================================================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def verify_provider(request, provider_id):
    reason = str(
        request.data.get("reason", "")
    ).strip()

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider_roles = provider_role_keys()

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_roles,
    ).first()

    if not provider:
        return Response(
            {
                "success": False,
                "message": "Provider not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    provider.is_verified = True
    provider.is_approved = True
    provider.is_active = True
    provider.status_note = ""
    provider.deactivate_reason = None

    provider.save(
        update_fields=[
            "is_verified",
            "is_approved",
            "is_active",
            "status_note",
            "deactivate_reason",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Provider verified successfully.",
            "reason": reason,
            "provider": {
                "id": provider.id,
                "username": provider.username,
                "is_verified": provider.is_verified,
                "is_approved": provider.is_approved,
                "is_active": provider.is_active,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UNVERIFY PROVIDER
# ============================================================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def unverify_provider(request, provider_id):
    reason = str(
        request.data.get("reason", "")
    ).strip()

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider_roles = provider_role_keys()

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_roles,
    ).first()

    if not provider:
        return Response(
            {
                "success": False,
                "message": "Provider not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    provider.is_verified = False
    provider.status_note = reason

    provider.save(
        update_fields=[
            "is_verified",
            "status_note",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Provider unverified successfully.",
            "reason": reason,
            "provider": {
                "id": provider.id,
                "username": provider.username,
                "is_verified": provider.is_verified,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# ALL CUSTOMERS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_customers(request):
    customers = User.objects.filter(
        role="customer"
    ).order_by("-date_joined")

    customer_data = []

    for customer in customers:
        customer_data.append(
            {
                "id": customer.id,
                "username": customer.username,
                "email": customer.email,
                "phone": customer.phone,
                "address": customer.address,
                "is_active": customer.is_active,
                "is_approved": customer.is_approved,
                "date_joined": customer.date_joined,
                "profile_picture": get_absolute_file_url(
                    request,
                    customer.profile_picture,
                ),
            }
        )

    return Response(
        {
            "success": True,
            "count": len(customer_data),
            "customers": customer_data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# ACTIVATE CUSTOMER
# ============================================================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def activate_customer(request, customer_id):
    customer = User.objects.filter(
        id=customer_id,
        role="customer",
    ).first()

    if not customer:
        return Response(
            {
                "success": False,
                "message": "Customer not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    customer.is_active = True
    customer.is_approved = True

    customer.save(
        update_fields=[
            "is_active",
            "is_approved",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Customer activated successfully.",
            "customer": {
                "id": customer.id,
                "username": customer.username,
                "is_active": customer.is_active,
                "is_approved": customer.is_approved,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DEACTIVATE CUSTOMER
# ============================================================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def deactivate_customer(request, customer_id):
    customer = User.objects.filter(
        id=customer_id,
        role="customer",
    ).first()

    if not customer:
        return Response(
            {
                "success": False,
                "message": "Customer not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    customer.is_active = False

    customer.save(
        update_fields=[
            "is_active",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Customer deactivated successfully.",
            "customer": {
                "id": customer.id,
                "username": customer.username,
                "is_active": customer.is_active,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# ALL SERVICE REQUESTS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_service_requests(request):
    service_requests = (
        CustomerServiceRequest.objects
        .select_related(
            "customer",
            "customer_address",
            "selected_provider",
        )
        .order_by("-created_at")
    )

    request_data = []

    for item in service_requests:
        request_address = item.address

        if item.customer_address:
            request_address = item.customer_address.address

        request_data.append(
            {
                "id": item.id,
                "customer_id": item.customer.id,
                "customer": item.customer.username,
                "service_type": item.service_type,
                "address": request_address,
                "lat": item.lat,
                "lon": item.lon,
                "description": item.description,
                "status": item.status,
                "is_booked": item.is_booked,
                "selected_provider_id": (
                    item.selected_provider.id
                    if item.selected_provider
                    else None
                ),
                "selected_provider": (
                    item.selected_provider.username
                    if item.selected_provider
                    else None
                ),
                "created_at": item.created_at,
            }
        )

    return Response(
        {
            "success": True,
            "count": len(request_data),
            "requests": request_data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# ALL BOOKINGS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_bookings(request):
    bookings = Booking.objects.select_related(
        "service_request",
        "customer",
        "provider",
    ).order_by("-created_at")

    booking_data = []

    for booking in bookings:
        booking_data.append(
            {
                "id": booking.id,
                "service_request_id": booking.service_request.id,
                "service_type": (
                    booking.service_request.service_type
                ),
                "customer_id": booking.customer.id,
                "customer": booking.customer.username,
                "provider_id": booking.provider.id,
                "provider": booking.provider.username,
                "final_price": booking.final_price,
                "status": booking.status,
                "created_at": booking.created_at,
                "updated_at": booking.updated_at,
            }
        )

    return Response(
        {
            "success": True,
            "count": len(booking_data),
            "bookings": booking_data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# ALL QUOTES
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_quotes(request):
    quotes = Quote.objects.select_related(
        "service_request",
        "service_request__customer",
        "provider",
    ).order_by("-created_at")

    quote_data = []

    for quote in quotes:
        quote_data.append(
            {
                "id": quote.id,
                "service_request_id": quote.service_request.id,
                "service_type": (
                    quote.service_request.service_type
                ),
                "customer_id": (
                    quote.service_request.customer.id
                ),
                "customer": (
                    quote.service_request.customer.username
                ),
                "provider_id": quote.provider.id,
                "provider": quote.provider.username,
                "price": quote.price,
                "message": quote.message,
                "status": quote.status,
                "created_at": quote.created_at,
            }
        )

    return Response(
        {
            "success": True,
            "count": len(quote_data),
            "quotes": quote_data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# PROVIDER PERFORMANCE
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def provider_performance(request):
    provider_roles = provider_role_keys()

    providers = User.objects.filter(
        role__in=provider_roles
    ).order_by("username")

    performance_data = []

    for provider in providers:
        provider_quotes = Quote.objects.filter(
            provider=provider
        )

        provider_bookings = Booking.objects.filter(
            provider=provider
        )

        provider_reviews = Review.objects.filter(
            provider=provider
        )

        total_quotes = provider_quotes.count()

        accepted_quotes = provider_quotes.filter(
            status="accepted"
        ).count()

        total_bookings = provider_bookings.count()

        completed_bookings = provider_bookings.filter(
            status="completed"
        ).count()

        cancelled_bookings = provider_bookings.filter(
            status="cancelled"
        ).count()

        average_rating = provider_reviews.aggregate(
            average=Avg("rating")
        ).get("average")

        if average_rating is None:
            average_rating = 0
        else:
            average_rating = round(
                float(average_rating),
                1,
            )

        acceptance_rate = 0

        if total_quotes > 0:
            acceptance_rate = round(
                (accepted_quotes / total_quotes) * 100,
                2,
            )

        completion_rate = 0

        if total_bookings > 0:
            completion_rate = round(
                (
                    completed_bookings
                    / total_bookings
                ) * 100,
                2,
            )

        performance_data.append(
            {
                "provider_id": provider.id,
                "provider": provider.username,
                "email": provider.email,
                "phone": provider.phone,
                "role": provider.role,
                "is_active": provider.is_active,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "profile_picture": get_absolute_file_url(
                    request,
                    provider.profile_picture,
                ),
                "total_quotes": total_quotes,
                "accepted_quotes": accepted_quotes,
                "acceptance_rate": acceptance_rate,
                "total_bookings": total_bookings,
                "completed_bookings": completed_bookings,
                "cancelled_bookings": cancelled_bookings,
                "completion_rate": completion_rate,
                "total_reviews": provider_reviews.count(),
                "average_rating": average_rating,
            }
        )

    return Response(
        {
            "success": True,
            "count": len(performance_data),
            "providers": performance_data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# ALL PROVIDERS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_providers(request):
    provider_roles = provider_role_keys()

    providers = User.objects.filter(
        role__in=provider_roles
    ).order_by("-date_joined")

    provider_data = []

    for provider in providers:
        provider_data.append(
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
                "status_note": provider.status_note,
                "deactivate_reason": provider.deactivate_reason,
                "profile_picture": get_absolute_file_url(
                    request,
                    provider.profile_picture,
                ),
                "date_joined": provider.date_joined,
            }
        )

    return Response(
        {
            "success": True,
            "count": len(provider_data),
            "providers": provider_data,
        },
        status=status.HTTP_200_OK,
    )
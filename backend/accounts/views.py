from django.contrib.auth import authenticate, login as django_login

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token

from .models import User, CustomerAddress
from .serializers import RegisterSerializer
from .helpers import (
    active_service_keys,
    dashboard_services,
    effective_role,
    is_active_service_key,
    is_provider_role,
    provider_list_payload,
    provider_rating,
    serialize_address,
    serialize_service_category,
    user_base_payload,
)
from .google_maps import (
    autocomplete_places,
    geocode_address_text,
    maps_configured,
    place_details,
    reverse_geocode,
)
from services.models import Review

# =====================================
# REGISTER API
# =====================================
from rest_framework.views import APIView
from adminpanel.models import ServiceCategory

from django.contrib.auth import update_session_auth_hash

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import ChangePasswordSerializer

class RegisterView(APIView):

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"success": True, "message": "User Registered Successfully"},
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def login_api(request):

    email = request.data.get(
        "email",
        ""
    ).strip().lower()

    password = request.data.get(
        "password",
        ""
    )

    if not email or not password:
        return Response(
            {
                "success": False,
                "message": "Email and password are required.",
                "code": "EMAIL_PASSWORD_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user_obj = User.objects.get(
            email__iexact=email
        )

    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Invalid email or password.",
                "code": "INVALID_CREDENTIALS",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = authenticate(
        username=user_obj.username,
        password=password,
    )

    if user is None:
        return Response(
            {
                "success": False,
                "message": "Invalid email or password.",
                "code": "INVALID_CREDENTIALS",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Block deactivated accounts.
    if not user.is_active:
        return Response(
            {
                "success": False,
                "message": "Your account has been deactivated.",
                "code": "ACCOUNT_DEACTIVATED",
                "data": {
                    "deactivate_reason": (
                        user.deactivate_reason or ""
                    ),
                },
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    role = (
        "admin"
        if user.is_superuser
        else user.role
    )

    # Superusers can bypass normal email/provider checks.
    if not user.is_superuser:

        # Customer and provider must verify their email.
        if not user.is_email_verified:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Please verify your email "
                        "before logging in."
                    ),
                    "code": "EMAIL_NOT_VERIFIED",
                    "data": {
                        "email": user.email,
                        "next_step": "verify_email",
                    },
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Dynamic provider roles must be approved by admin.
        if (
            is_provider_role(user.role)
            and not user.is_approved
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Your provider account is waiting "
                        "for admin approval."
                    ),
                    "code": "PROVIDER_APPROVAL_PENDING",
                    "data": {
                        "email": user.email,
                        "role": user.role,
                        "is_email_verified": (
                            user.is_email_verified
                        ),
                        "is_approved": user.is_approved,
                        "next_step": (
                            "wait_for_admin_approval"
                        ),
                    },
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    token, _ = Token.objects.get_or_create(
        user=user
    )

    django_login(
        request,
        user
    )

    redirect_map = {
        "customer": "/customer-dashboard",
        "admin": "/admin-dashboard",
    }

    if is_provider_role(role):
        redirect_url = "/provider-dashboard"
    else:
        redirect_url = redirect_map.get(
            role,
            "/dashboard"
        )

    return Response(
        {
            "success": True,
            "message": "Login successful.",
            "token": token.key,
            "user": user_base_payload(
                user,
                request
            ),
            "redirect_url": redirect_url,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_api(request):
    user = request.user
    role = effective_role(user)
    dashboard_data = user_base_payload(user, request)

    if is_provider_role(role):
        average_rating, total_reviews = provider_rating(user)
        dashboard_data["average_rating"] = average_rating
        dashboard_data["total_reviews"] = total_reviews

    if role == "customer":
        dashboard_data["dashboard_type"] = "Customer Dashboard"
        categories = list(dashboard_services())
        active = [c for c in categories if c.status == "active"]
        dashboard_data["popular_services"] = [
            serialize_service_category(c, request) for c in active[:3]
        ]
        dashboard_data["services"] = [
            serialize_service_category(c, request) for c in categories
        ]
        dashboard_data["features"] = [
            "Book Services",
            "View Bookings",
            "Track Requests",
            "Popular Services",
            "Coming Soon Services",
        ]

    elif role == "admin":
        dashboard_data["dashboard_type"] = "Admin Dashboard"
        dashboard_data["features"] = [
            "Manage Providers",
            "Manage Services",
            "Monitor Marketplace",
            "View Performance",
        ]

    elif is_provider_role(role):
        service_name = role.replace('_', ' ').title()
        dashboard_data["dashboard_type"] = f"{service_name} Dashboard"
        dashboard_data["features"] = [
            "View Service Requests",
            "Send Quotations",
            "Manage Jobs",
            "View Rating",
        ]

    return Response({
        "success": True,
        "message": "Dashboard Loaded Successfully",
        "data": dashboard_data,
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def providers_by_service(request):
    user = request.user
    if user.role != "customer":
        return Response({
            "success": False,
            "message": "Only customers can view providers list",
        }, status=403)

    service = request.GET.get("service")
    if not service or not is_active_service_key(service):
        return Response({
            "success": False,
            "message": "Invalid service type",
        }, status=400)

    providers = User.objects.filter(
        role=service,
        is_active=True,
        is_approved=True
    )

    data = []

    for p in providers:

        data.append({

            "id": p.id,

            "username": p.username,

            "email": p.email,

            "phone": p.phone,

            "address": p.address,

            "role": p.role,

            "bio": p.bio,

            "experience_years": p.experience_years,

            "is_verified": p.is_verified,

            "profile_picture": (
                request.build_absolute_uri(
                    p.profile_picture.url
                )
                if p.profile_picture else None
            ),
        })

    return Response({
        "success": True,
        "service": service,
        "total_providers": providers.count(),
        "providers": [
            provider_list_payload(p, request) for p in providers
        ],
    })

# =====================================
# CUSTOMER DASHBOARD API
# =====================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_dashboard(request):
    user = request.user
    if user.role != "customer":
        return Response(
            {"success": False, "message": "Only customers allowed"},
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response({
        "success": True,
        "customer": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "address": user.address,
        }
    })


def _parse_coords(request):
    lat = request.data.get("latitude", request.data.get("lat"))
    lon = request.data.get("longitude", request.data.get("lon"))
    if lat is None or lon is None:
        return None, None, "latitude and longitude required"
    try:
        return float(lat), float(lon), None
    except (TypeError, ValueError):
        return None, None, "latitude and longitude must be valid numbers"


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_address(request):

    address = CustomerAddress.objects.create(
        customer=request.user,
        title=request.data.get("title"),
        address=request.data.get("address"),
        latitude=request.data.get("latitude"),
        longitude=request.data.get("longitude"),
    )

    return Response({
        "success": True,
        "address": {
            "id": address.id,
            "title": address.title,
            "address": address.address,
            "latitude": address.latitude,
            "longitude": address.longitude,
        }
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_addresses(request):
    addresses = CustomerAddress.objects.filter(
        customer=request.user,
    ).order_by("-created_at")

    return Response({
        "success": True,
        "addresses": [
            {
                "id": item.id,
                "title": item.title,
                "address": item.address,
                "latitude": item.latitude,
                "longitude": item.longitude,
            }
            for item in addresses
        ]
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_address(request, address_id):
    address = CustomerAddress.objects.filter(
        id=address_id,
        customer=request.user,
    ).first()

    if not address:
        return Response({
            "success": False,
            "message": "Address not found",
        }, status=status.HTTP_404_NOT_FOUND)

    address.delete()
    return Response({
        "success": True,
        "message": "Address deleted",
    })
    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def edit_address(request, address_id):

    address = CustomerAddress.objects.filter(
        id=address_id,
        customer=request.user
    ).first()

    if not address:
        return Response(
            {
                "success": False,
                "message": "Address not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    title = request.data.get("title")
    address_text = request.data.get("address")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    if title is not None:
        address.title = title

    if address_text is not None:
        address.address = address_text

    if latitude is not None:
        address.latitude = latitude

    if longitude is not None:
        address.longitude = longitude

    address.save()

    return Response({
        "success": True,
        "message": "Address updated successfully",

        "address": {
            "id": address.id,
            "title": address.title,
            "address": address.address,
            "latitude": address.latitude,
            "longitude": address.longitude,
        }
    }, status=status.HTTP_200_OK)    


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def edit_address(request, address_id):
    if request.user.role != "customer":
        return Response(
            {"success": False, "message": "Only customers allowed"},
            status=status.HTTP_403_FORBIDDEN,
        )

    address = CustomerAddress.objects.filter(
        id=address_id,
        customer=request.user,
    ).first()

    if not address:
        return Response({
            "success": False,
            "message": "Address not found",
        }, status=status.HTTP_404_NOT_FOUND)

    title = request.data.get("title")
    address_text = request.data.get("address")
    lat, lon, err = _parse_coords(request)

    if title:
        address.title = title
    if address_text:
        address.address = address_text
    if lat is not None and lon is not None:
        address.latitude = lat
        address.longitude = lon
    elif err and (request.data.get("latitude") is not None or request.data.get("lat") is not None):
        return Response(
            {"success": False, "message": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    address.save()

    return Response({
        "success": True,
        "message": "Address updated successfully",
        "address": serialize_address(address),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maps_status(request):
    return Response({
        "success": True,
        "configured": maps_configured(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maps_autocomplete(request):
    query = (request.query_params.get("input") or "").strip()
    configured = maps_configured()

    if len(query) < 2:
        return Response({
            "success": True,
            "configured": configured,
            "predictions": [],
        })

    predictions, err = autocomplete_places(query)
    if err:
        return Response(
            {"success": False, "configured": configured, "message": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({
        "success": True,
        "configured": True,
        "predictions": predictions,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maps_place_details(request):
    place_id = (request.query_params.get("place_id") or "").strip()
    if not place_id:
        return Response(
            {"success": False, "message": "place_id required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    details, err = place_details(place_id)
    if err:
        return Response(
            {"success": False, "message": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({"success": True, **details})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maps_geocode_address(request):
    address = (request.query_params.get("address") or "").strip()
    if len(address) < 3:
        return Response(
            {"success": False, "message": "address required (min 3 characters)"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    details, err = geocode_address_text(address)
    if err:
        return Response(
            {"success": False, "message": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({"success": True, **details})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maps_reverse_geocode(request):
    lat = request.query_params.get("lat")
    lon = request.query_params.get("lon")
    if lat is None or lon is None:
        return Response(
            {"success": False, "message": "lat and lon required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return Response(
            {"success": False, "message": "lat and lon must be numbers"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    address, err = reverse_geocode(lat_f, lon_f)
    if err:
        return Response(
            {"success": False, "message": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({
        "success": True,
        "address": address,
        "lat": lat_f,
        "lon": lon_f,
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def active_services(request):

    services = ServiceCategory.objects.filter(
        status="active"
    ).order_by("display_order")

    return Response({
        "success": True,
        "services": [
            {
                "id": service.id,
                "name": service.name,
                "key": service.key,
                "description": service.description,
                "status": service.status,

                "service_image": (
                    request.build_absolute_uri(
                        service.service_image.url
                    )
                    if service.service_image else None
                )
            }
            for service in services
        ]
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):

    serializer = ChangePasswordSerializer(
        data=request.data,
        context={
            "request": request
        }
    )

    serializer.is_valid(
        raise_exception=True
    )

    user = request.user

    user.set_password(
        serializer.validated_data["new_password"]
    )

    user.save(
        update_fields=["password"]
    )

    # Keeps session-based users logged in.
    # It does not cause any problem with token authentication.
    update_session_auth_hash(
        request,
        user
    )

    return Response(
        {
            "success": True,
            "message": "Password changed successfully."
        },
        status=status.HTTP_200_OK
    )

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .serializers import (
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

User = get_user_model()

@api_view(["POST"])
@permission_classes([])
def forgot_password(request):

    serializer = ForgotPasswordSerializer(
        data=request.data
    )

    serializer.is_valid(
        raise_exception=True
    )

    email = serializer.validated_data["email"]

    user = User.objects.get(
        email__iexact=email
    )

    uid = urlsafe_base64_encode(
        force_bytes(user.pk)
    )

    token = default_token_generator.make_token(
        user
    )

    frontend_url = getattr(
        settings,
        "FRONTEND_URL",
        "http://localhost:3000"
    )

    reset_link = (
        f"{frontend_url}/reset-password"
        f"?uid={uid}&token={token}"
    )

    subject = "Reset your password"

    message = (
        f"Hello {user.get_full_name() or user.username},\n\n"
        "We received a request to reset your password.\n\n"
        f"Reset your password using this link:\n{reset_link}\n\n"
        "If you did not request this, you can ignore this email."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False
    )

    return Response(
        {
            "success": True,
            "message": (
                "Password reset link has been sent to your email."
            )
        },
        status=status.HTTP_200_OK
    )

@api_view(["POST"])
@permission_classes([])
def reset_password(request):

    serializer = ResetPasswordSerializer(
        data=request.data
    )

    serializer.is_valid(
        raise_exception=True
    )

    user = serializer.validated_data["user"]
    token = serializer.validated_data["token"]

    if not default_token_generator.check_token(
        user,
        token
    ):
        return Response(
            {
                "success": False,
                "message": (
                    "Password reset link is invalid or has expired."
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(
        serializer.validated_data["new_password"]
    )

    user.save(
        update_fields=["password"]
    )

    return Response(
        {
            "success": True,
            "message": "Password reset successfully."
        },
        status=status.HTTP_200_OK
    )

from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .email_service import send_verification_otp_email
from .otp_utils import create_or_replace_email_otp


User = get_user_model()

@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def register(request):

    name = request.data.get(
        "name",
        ""
    ).strip()

    email = request.data.get(
        "email",
        ""
    ).strip().lower()

    password = request.data.get(
        "password",
        ""
    )

    confirm_password = request.data.get(
        "confirm_password",
        ""
    )

    role = request.data.get(
        "role",
        "customer"
    ).strip().lower()

    if not name:
        return Response(
            {
                "success": False,
                "message": "Name is required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not email:
        return Response(
            {
                "success": False,
                "message": "Email is required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not password:
        return Response(
            {
                "success": False,
                "message": "Password is required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if password != confirm_password:
        return Response(
            {
                "success": False,
                "message": (
                    "Password and confirm password "
                    "do not match."
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(
        email__iexact=email
    ).exists():
        return Response(
            {
                "success": False,
                "message": (
                    "An account already exists "
                    "with this email."
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Use your existing dynamic role validation here.
    # Do not hardcode provider service names.

    is_customer = role == "customer"

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        role=role
    )

    if hasattr(user, "name"):
        user.name = name

    user.first_name = name
    user.is_email_verified = False
    user.is_approved = is_customer
    user.is_active = True

    user.save()

    otp, otp_record = create_or_replace_email_otp(
        user
    )

    transaction.on_commit(
    lambda: send_verification_otp_email(
        user=user,
        otp=otp
    )
)

    return Response(
        {
            "success": True,
            "message": (
                "Registration successful. "
                "A verification OTP has been sent "
                "to your email."
            ),
            "data": {
                "user_id": user.id,
                "name": name,
                "email": user.email,
                "role": user.role,
                "is_email_verified": False,
                "is_approved": user.is_approved,
                "next_step": "verify_email"
            }
        },
        status=status.HTTP_201_CREATED
    )


from django.contrib.auth.hashers import check_password

from .models import EmailVerificationOTP
from .serializers import VerifyEmailOTPSerializer

@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def verify_email(request):

    serializer = VerifyEmailOTPSerializer(
        data=request.data
    )

    serializer.is_valid(
        raise_exception=True
    )

    email = serializer.validated_data["email"]
    entered_otp = serializer.validated_data["otp"]

    try:
        user = User.objects.select_for_update().get(
            email__iexact=email
        )

    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Account not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if user.is_email_verified:
        return Response(
            {
                "success": True,
                "message": "Email is already verified.",
                "data": {
                    "email": user.email,
                    "is_email_verified": True,
                    "is_approved": user.is_approved
                }
            },
            status=status.HTTP_200_OK
        )

    try:
        otp_record = (
            EmailVerificationOTP.objects
            .select_for_update()
            .get(user=user)
        )

    except EmailVerificationOTP.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": (
                    "No verification OTP was found. "
                    "Please request a new OTP."
                ),
                "code": "OTP_NOT_FOUND"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if otp_record.is_expired():
        return Response(
            {
                "success": False,
                "message": (
                    "OTP has expired. "
                    "Please request a new OTP."
                ),
                "code": "OTP_EXPIRED"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    maximum_attempts = 5

    if otp_record.attempts >= maximum_attempts:
        return Response(
            {
                "success": False,
                "message": (
                    "Maximum verification attempts reached. "
                    "Please request a new OTP."
                ),
                "code": "OTP_ATTEMPTS_EXCEEDED"
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    if not check_password(
        entered_otp,
        otp_record.otp_hash
    ):
        otp_record.attempts += 1

        otp_record.save(
            update_fields=[
                "attempts",
                "updated_at"
            ]
        )

        return Response(
            {
                "success": False,
                "message": "Invalid OTP.",
                "code": "INVALID_OTP",
                "attempts_remaining": max(
                    maximum_attempts
                    - otp_record.attempts,
                    0
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    user.is_email_verified = True

    user.save(
        update_fields=[
            "is_email_verified"
        ]
    )

    otp_record.delete()

    is_customer = user.role == "customer"

    if is_customer:
        message = (
            "Email verified successfully. "
            "You can now log in."
        )
        next_step = "login"

    else:
        message = (
            "Email verified successfully. "
            "Your provider account is waiting "
            "for admin approval."
        )
        next_step = "wait_for_admin_approval"

    return Response(
        {
            "success": True,
            "message": message,
            "data": {
                "user_id": user.id,
                "email": user.email,
                "role": user.role,
                "is_email_verified": True,
                "is_approved": user.is_approved,
                "next_step": next_step
            }
        },
        status=status.HTTP_200_OK
    )

from datetime import timedelta

from django.utils import timezone

from .serializers import ResendEmailOTPSerializer

@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def resend_email_otp(request):

    serializer = ResendEmailOTPSerializer(
        data=request.data
    )

    serializer.is_valid(
        raise_exception=True
    )

    email = serializer.validated_data["email"]

    try:
        user = User.objects.select_for_update().get(
            email__iexact=email
        )

    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Account not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if user.is_email_verified:
        return Response(
            {
                "success": False,
                "message": "Email is already verified.",
                "code": "EMAIL_ALREADY_VERIFIED"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    otp_record = (
        EmailVerificationOTP.objects
        .select_for_update()
        .filter(user=user)
        .first()
    )

    minimum_resend_delay = timedelta(
        seconds=60
    )

    maximum_resends = 5

    if otp_record and otp_record.last_sent_at:

        resend_available_at = (
            otp_record.last_sent_at
            + minimum_resend_delay
        )

        if timezone.now() < resend_available_at:

            retry_after = int(
                (
                    resend_available_at
                    - timezone.now()
                ).total_seconds()
            )

            return Response(
                {
                    "success": False,
                    "message": (
                        "Please wait before requesting "
                        "another OTP."
                    ),
                    "code": "OTP_RESEND_TOO_SOON",
                    "retry_after_seconds": max(
                        retry_after,
                        1
                    )
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

    if (
        otp_record
        and otp_record.resend_count >= maximum_resends
    ):
        return Response(
            {
                "success": False,
                "message": (
                    "Maximum OTP resend limit reached."
                ),
                "code": "OTP_RESEND_LIMIT_REACHED"
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    previous_resend_count = (
        otp_record.resend_count
        if otp_record
        else 0
    )

    otp, otp_record = create_or_replace_email_otp(
        user
    )

    otp_record.resend_count = (
        previous_resend_count + 1
    )

    otp_record.save(
        update_fields=[
            "resend_count",
            "updated_at"
        ]
    )

    transaction.on_commit(
        lambda: send_verification_otp_email(
            user=user,
            otp=otp
        )
    )

    return Response(
        {
            "success": True,
            "message": (
                "A new verification OTP "
                "has been sent."
            ),
            "data": {
                "email": user.email,
                "otp_expires_in_minutes": 10
            }
        },
        status=status.HTTP_200_OK
    )


from django.contrib.auth import logout as django_logout
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.helpers import is_provider_role

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_all_api(request):
    """
    Logs the authenticated user out from all active token-based sessions.
    """

    user = request.user

    # Delete every DRF authentication token belonging to the user.
    deleted_count, _ = Token.objects.filter(
        user=user
    ).delete()

    # Clear the Django session if session authentication is also being used.
    django_logout(request)

    return Response(
        {
            "success": True,
            "message": "Logged out successfully from all devices.",
            "data": {
                "user_id": user.id,
                "tokens_deleted": deleted_count,
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def account_status_api(request):
    """
    Returns the authenticated user's account, verification,
    approval and login-access status.
    """

    user = request.user

    role = (
        "admin"
        if user.is_superuser
        else user.role
    )

    provider = (
        False
        if user.is_superuser
        else is_provider_role(user.role)
    )

    can_login = True
    next_step = "dashboard"
    account_message = "Your account is active and ready to use."

    if not user.is_active:
        can_login = False
        next_step = "contact_support"
        account_message = (
            user.deactivate_reason
            or "Your account has been deactivated."
        )

    elif not user.is_superuser and not user.is_email_verified:
        can_login = False
        next_step = "verify_email"
        account_message = (
            "Please verify your email address."
        )

    elif provider and not user.is_approved:
        can_login = False
        next_step = "wait_for_admin_approval"
        account_message = (
            "Your provider account is waiting for admin approval."
        )

    elif provider and not user.is_verified:
        # This does not block access unless your business rules require it.
        next_step = "complete_provider_verification"
        account_message = (
            "Your account is approved, but provider verification "
            "is not yet complete."
        )

    return Response(
        {
            "success": True,
            "message": "Account status fetched successfully.",
            "data": {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "role": role,
                "is_provider": provider,
                "is_active": user.is_active,
                "is_email_verified": (
                    True
                    if user.is_superuser
                    else user.is_email_verified
                ),
                "is_verified": (
                    True
                    if user.is_superuser
                    else user.is_verified
                ),
                "is_approved": (
                    True
                    if user.is_superuser
                    else user.is_approved
                ),
                "can_login": can_login,
                "next_step": next_step,
                "status_note": user.status_note or "",
                "deactivate_reason": (
                    user.deactivate_reason or ""
                ),
                "account_message": account_message,
            },
        },
        status=status.HTTP_200_OK,
    )

from rest_framework.parsers import (
    FormParser,
    MultiPartParser,
)
from rest_framework.decorators import (
    api_view,
    parser_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.serializers import (
    ProfileImageSerializer,
    UpdateProfileSerializer,
    UserProfileSerializer,
)
from accounts.profile_utils import (
    calculate_profile_completion,
)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_profile_api(request):

    serializer = UserProfileSerializer(
        request.user,
        context={
            "request": request,
        },
    )

    completion = calculate_profile_completion(
        request.user
    )

    return Response(
        {
            "success": True,
            "message": "Profile fetched successfully.",
            "data": {
                "profile": serializer.data,
                "profile_completion": completion[
                    "percentage"
                ],
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_profile_api(request):

    serializer = UpdateProfileSerializer(
        request.user,
        data=request.data,
        partial=True,
        context={
            "request": request,
        },
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Profile update failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = serializer.save()

    profile_serializer = UserProfileSerializer(
        user,
        context={
            "request": request,
        },
    )

    completion = calculate_profile_completion(
        user
    )

    return Response(
        {
            "success": True,
            "message": "Profile updated successfully.",
            "data": {
                "profile": profile_serializer.data,
                "profile_completion": completion[
                    "percentage"
                ],
                "missing_fields": completion[
                    "missing_fields"
                ],
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([
    MultiPartParser,
    FormParser,
])
def upload_profile_image_api(request):

    serializer = ProfileImageSerializer(
        request.user,
        data=request.data,
        partial=True,
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Profile image upload failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    old_picture = request.user.profile_picture

    user = serializer.save()

    if (
        old_picture
        and old_picture.name
        and old_picture.name
        != user.profile_picture.name
    ):
        old_picture.delete(
            save=False
        )

    profile_picture_url = None

    if user.profile_picture:
        profile_picture_url = (
            request.build_absolute_uri(
                user.profile_picture.url
            )
        )

    completion = calculate_profile_completion(
        user
    )

    return Response(
        {
            "success": True,
            "message": "Profile image uploaded successfully.",
            "data": {
                "profile_picture": (
                    profile_picture_url
                ),
                "profile_completion": completion[
                    "percentage"
                ],
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_profile_image_api(request):

    user = request.user

    if not user.profile_picture:
        return Response(
            {
                "success": False,
                "message": (
                    "Profile image does not exist."
                ),
                "code": "PROFILE_IMAGE_NOT_FOUND",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    profile_picture = user.profile_picture

    user.profile_picture = None
    user.save(
        update_fields=[
            "profile_picture",
        ]
    )

    profile_picture.delete(
        save=False
    )

    completion = calculate_profile_completion(
        user
    )

    return Response(
        {
            "success": True,
            "message": "Profile image deleted successfully.",
            "data": {
                "profile_picture": None,
                "profile_completion": completion[
                    "percentage"
                ],
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_completion_api(request):

    completion = calculate_profile_completion(
        request.user
    )

    return Response(
        {
            "success": True,
            "message": (
                "Profile completion fetched successfully."
            ),
            "data": completion,
        },
        status=status.HTTP_200_OK,
    )

@api_view([
    "POST",
    "DELETE",
])
@permission_classes([IsAuthenticated])
@parser_classes([
    MultiPartParser,
    FormParser,
])
def profile_image_api(request):

    user = request.user

    if request.method == "POST":

        serializer = ProfileImageSerializer(
            user,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": (
                        "Profile image upload failed."
                    ),
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_picture = user.profile_picture

        user = serializer.save()

        if (
            old_picture
            and old_picture.name
            and old_picture.name
            != user.profile_picture.name
        ):
            old_picture.delete(
                save=False
            )

        profile_picture_url = (
            request.build_absolute_uri(
                user.profile_picture.url
            )
        )

        completion = calculate_profile_completion(
            user
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Profile image uploaded successfully."
                ),
                "data": {
                    "profile_picture": (
                        profile_picture_url
                    ),
                    "profile_completion": (
                        completion["percentage"]
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )

    if not user.profile_picture:
        return Response(
            {
                "success": False,
                "message": (
                    "Profile image does not exist."
                ),
                "code": "PROFILE_IMAGE_NOT_FOUND",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    profile_picture = user.profile_picture

    user.profile_picture = None
    user.save(
        update_fields=[
            "profile_picture",
        ]
    )

    profile_picture.delete(
        save=False
    )

    completion = calculate_profile_completion(
        user
    )

    return Response(
        {
            "success": True,
            "message": (
                "Profile image deleted successfully."
            ),
            "data": {
                "profile_picture": None,
                "profile_completion": (
                    completion["percentage"]
                ),
            },
        },
        status=status.HTTP_200_OK,
    )
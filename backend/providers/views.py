from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from providers.models import (
    ProviderProfile,
    ProviderService,
)
from providers.permissions import IsApprovedProvider
from providers.serializers import (
    ProviderProfileSerializer,
    ProviderServiceSerializer,
)
from providers.models import (
    ProviderAvailability,
    ProviderProfile,
    ProviderService,
)
from providers.serializers import (
    ProviderAvailabilitySerializer,
    ProviderServiceAreaSerializer,
)

@api_view([
    "GET",
    "POST",
    "PATCH",
])
@permission_classes([
    IsAuthenticated,
    IsApprovedProvider,
])
@transaction.atomic
def provider_profile_api(request):
    profile = ProviderProfile.objects.filter(
        provider=request.user,
    ).first()

    if request.method == "GET":
        if not profile:
            return Response(
                {
                    "success": False,
                    "message": "Provider profile does not exist.",
                    "code": "PROVIDER_PROFILE_NOT_FOUND",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProviderProfileSerializer(
            profile,
            context={
                "request": request,
            },
        )

        return Response(
            {
                "success": True,
                "message": "Provider profile fetched successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    if request.method == "POST":
        if profile:
            return Response(
                {
                    "success": False,
                    "message": "Provider profile already exists.",
                    "code": "PROVIDER_PROFILE_ALREADY_EXISTS",
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = ProviderProfileSerializer(
            data=request.data,
            context={
                "request": request,
            },
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Provider profile creation failed.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = serializer.save(
            provider=request.user,
        )

        return Response(
            {
                "success": True,
                "message": "Provider profile created successfully.",
                "data": ProviderProfileSerializer(
                    profile,
                    context={
                        "request": request,
                    },
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    if not profile:
        return Response(
            {
                "success": False,
                "message": "Create your provider profile first.",
                "code": "PROVIDER_PROFILE_NOT_FOUND",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = ProviderProfileSerializer(
        profile,
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
                "message": "Provider profile update failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile = serializer.save()

    return Response(
        {
            "success": True,
            "message": "Provider profile updated successfully.",
            "data": ProviderProfileSerializer(
                profile,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view([
    "GET",
    "POST",
])
@permission_classes([
    IsAuthenticated,
    IsApprovedProvider,
])
def provider_service_list_create_api(request):
    profile = ProviderProfile.objects.filter(
        provider=request.user,
    ).first()

    if not profile:
        return Response(
            {
                "success": False,
                "message": "Create your provider profile first.",
                "code": "PROVIDER_PROFILE_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "GET":
        services = profile.services.select_related(
            "category",
        ).all()

        serializer = ProviderServiceSerializer(
            services,
            many=True,
        )

        return Response(
            {
                "success": True,
                "message": "Provider services fetched successfully.",
                "count": services.count(),
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    serializer = ProviderServiceSerializer(
        data=request.data,
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Provider service creation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    category = serializer.validated_data["category"]

    if ProviderService.objects.filter(
        provider_profile=profile,
        category=category,
    ).exists():
        return Response(
            {
                "success": False,
                "message": (
                    "You have already added this service category."
                ),
                "code": "SERVICE_ALREADY_ADDED",
            },
            status=status.HTTP_409_CONFLICT,
        )

    service = serializer.save(
        provider_profile=profile,
    )

    return Response(
        {
            "success": True,
            "message": "Provider service added successfully.",
            "data": ProviderServiceSerializer(
                service,
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )

@api_view([
    "GET",
    "POST",
])
@permission_classes([
    IsAuthenticated,
    IsApprovedProvider,
])
def provider_availability_api(request):
    profile = ProviderProfile.objects.filter(
        provider=request.user,
    ).first()

    if not profile:
        return Response(
            {
                "success": False,
                "message": "Create your provider profile first.",
                "code": "PROVIDER_PROFILE_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "GET":
        slots = profile.availability_slots.all()

        serializer = ProviderAvailabilitySerializer(
            slots,
            many=True,
        )

        return Response(
            {
                "success": True,
                "message": "Provider availability fetched successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    serializer = ProviderAvailabilitySerializer(
        data=request.data,
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Availability creation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    availability = serializer.save(
        provider_profile=profile,
    )

    return Response(
        {
            "success": True,
            "message": "Availability added successfully.",
            "data": ProviderAvailabilitySerializer(
                availability,
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )

@api_view([
    "GET",
    "POST",
])
@permission_classes([
    IsAuthenticated,
    IsApprovedProvider,
])
@transaction.atomic
def provider_service_area_api(request):
    profile = ProviderProfile.objects.filter(
        provider=request.user,
    ).first()

    if not profile:
        return Response(
            {
                "success": False,
                "message": "Create your provider profile first.",
                "code": "PROVIDER_PROFILE_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "GET":
        areas = profile.service_areas.all()

        serializer = ProviderServiceAreaSerializer(
            areas,
            many=True,
        )

        return Response(
            {
                "success": True,
                "message": "Service areas fetched successfully.",
                "count": areas.count(),
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    serializer = ProviderServiceAreaSerializer(
        data=request.data,
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Service area creation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if serializer.validated_data.get("is_primary"):
        profile.service_areas.update(
            is_primary=False,
        )

    area = serializer.save(
        provider_profile=profile,
    )

    return Response(
        {
            "success": True,
            "message": "Service area added successfully.",
            "data": ProviderServiceAreaSerializer(
                area,
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )
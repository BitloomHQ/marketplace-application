from rest_framework import serializers

from providers.models import (
    ProviderProfile,
    ProviderService,
)
from services.models import ServiceCategory
from providers.models import ProviderAvailability, ProviderServiceArea


class ProviderServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    category_slug = serializers.CharField(
        source="category.slug",
        read_only=True,
    )

    class Meta:
        model = ProviderService
        fields = [
            "id",
            "category",
            "category_name",
            "category_slug",
            "title",
            "description",
            "pricing_type",
            "base_price",
            "estimated_duration_minutes",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_category(self, category):
        if not category.is_active:
            raise serializers.ValidationError(
                "The selected service category is inactive."
            )

        return category

    def validate(self, attrs):
        pricing_type = attrs.get(
            "pricing_type",
            getattr(
                self.instance,
                "pricing_type",
                "quotation",
            ),
        )

        base_price = attrs.get(
            "base_price",
            getattr(
                self.instance,
                "base_price",
                None,
            ),
        )

        if pricing_type != "quotation" and base_price is None:
            raise serializers.ValidationError(
                {
                    "base_price": (
                        "Base price is required for this pricing type."
                    ),
                }
            )

        return attrs


class ProviderProfileSerializer(serializers.ModelSerializer):
    provider_id = serializers.IntegerField(
        source="provider.id",
        read_only=True,
    )

    provider_name = serializers.SerializerMethodField()
    provider_email = serializers.EmailField(
        source="provider.email",
        read_only=True,
    )

    services = ProviderServiceSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = ProviderProfile
        fields = [
            "id",
            "provider_id",
            "provider_name",
            "provider_email",
            "business_name",
            "professional_title",
            "description",
            "total_experience_years",
            "accepts_emergency_work",
            "minimum_booking_amount",
            "is_available",
            "is_profile_active",
            "completed_jobs",
            "average_rating",
            "services",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "completed_jobs",
            "average_rating",
            "created_at",
            "updated_at",
        ]

    def get_provider_name(self, obj):
        return (
            obj.provider.get_full_name()
            or obj.provider.username
        )

class ProviderAvailabilitySerializer(
    serializers.ModelSerializer
):
    day_name = serializers.CharField(
        source="get_day_of_week_display",
        read_only=True,
    )

    class Meta:
        model = ProviderAvailability
        fields = [
            "id",
            "day_of_week",
            "day_name",
            "start_time",
            "end_time",
            "is_available",
        ]

        read_only_fields = [
            "id",
        ]

    def validate(self, attrs):
        is_available = attrs.get(
            "is_available",
            True,
        )

        start_time = attrs.get(
            "start_time",
        )

        end_time = attrs.get(
            "end_time",
        )

        if is_available:
            if not start_time or not end_time:
                raise serializers.ValidationError(
                    "Start time and end time are required."
                )

            if start_time >= end_time:
                raise serializers.ValidationError(
                    "End time must be later than start time."
                )

        return attrs

class ProviderServiceAreaSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = ProviderServiceArea
        fields = [
            "id",
            "label",
            "address",
            "city",
            "state",
            "postal_code",
            "latitude",
            "longitude",
            "service_radius_km",
            "is_primary",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_service_radius_km(self, value):
        if value > 200:
            raise serializers.ValidationError(
                "Service radius cannot exceed 200 km."
            )

        return value
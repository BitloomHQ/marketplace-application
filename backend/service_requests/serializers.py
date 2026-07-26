from django.utils import timezone
from rest_framework import serializers

from .models import (
    CustomerServiceRequest,
    ServiceRequestImage,
)


class ServiceRequestImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequestImage
        fields = [
            "id",
            "image",
            "image_url",
            "uploaded_at",
        ]

        read_only_fields = [
            "id",
            "uploaded_at",
        ]

    def get_image_url(self, obj):
        request = self.context.get("request")

        if request and obj.image:
            return request.build_absolute_uri(obj.image.url)

        return obj.image.url if obj.image else None


class CustomerServiceRequestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    customer_name = serializers.SerializerMethodField()

    images = ServiceRequestImageSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = CustomerServiceRequest
        fields = [
            "id",
            "customer_name",
            "category",
            "category_name",
            "title",
            "description",
            "urgency",
            "preferred_date",
            "preferred_start_time",
            "preferred_end_time",
            "budget_min",
            "budget_max",
            "service_address",
            "city",
            "state",
            "postal_code",
            "latitude",
            "longitude",
            "status",
            "cancellation_reason",
            "images",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        return (
            obj.customer.get_full_name()
            or obj.customer.username
        )

    def validate_category(self, category):
        if not category.is_active:
            raise serializers.ValidationError(
                "The selected service category is inactive."
            )

        return category

    def validate_preferred_date(self, value):
        if value and value < timezone.localdate():
            raise serializers.ValidationError(
                "Preferred date cannot be in the past."
            )

        return value

    def validate(self, attrs):
        budget_min = attrs.get("budget_min")
        budget_max = attrs.get("budget_max")

        if (
            budget_min is not None
            and budget_max is not None
            and budget_min > budget_max
        ):
            raise serializers.ValidationError(
                {
                    "budget_max": (
                        "Maximum budget must be greater than "
                        "or equal to minimum budget."
                    )
                }
            )

        start_time = attrs.get("preferred_start_time")
        end_time = attrs.get("preferred_end_time")

        if (
            start_time
            and end_time
            and start_time >= end_time
        ):
            raise serializers.ValidationError(
                {
                    "preferred_end_time": (
                        "End time must be later than start time."
                    )
                }
            )

        return attrs
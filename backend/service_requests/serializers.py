from django.utils import timezone
from rest_framework import serializers

from .models import (
    CustomerServiceRequest,
    ProviderQuotation,
    ServiceBooking,
    ServiceNotification,
    ServiceRequestImage,
    ServiceReview,
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
        if category.status != 'active':
            raise serializers.ValidationError(
                'The selected service category is inactive.',
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


class ProviderQuotationSerializer(serializers.ModelSerializer):

    provider_id = serializers.IntegerField(
        source="provider_profile.provider.id",
        read_only=True,
    )

    provider_name = serializers.SerializerMethodField()

    business_name = serializers.CharField(
        source="provider_profile.business_name",
        read_only=True,
    )

    average_rating = serializers.DecimalField(
        source="provider_profile.average_rating",
        max_digits=3,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ProviderQuotation

        fields = [
            "id",
            "service_request",
            "provider_profile",

            "provider_id",
            "provider_name",
            "business_name",
            "average_rating",

            "quoted_price",
            "message",
            "estimated_duration_minutes",

            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "service_request",
            "provider_profile",

            "provider_id",
            "provider_name",
            "business_name",
            "average_rating",

            "status",
            "created_at",
            "updated_at",
        ]

    def get_provider_name(self, obj):
        user = obj.provider_profile.provider

        return (
            user.get_full_name()
            or user.username
            or user.email
        )

class ServiceBookingSerializer(serializers.ModelSerializer):

    provider_id = serializers.IntegerField(
        source="provider_profile.provider.id",
        read_only=True,
    )

    provider_name = serializers.SerializerMethodField()

    business_name = serializers.CharField(
        source="provider_profile.business_name",
        read_only=True,
    )

    request_title = serializers.CharField(
        source="service_request.title",
        read_only=True,
    )

    quotation_price = serializers.DecimalField(
        source="quotation.quoted_price",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    has_review = serializers.SerializerMethodField()
    review_id = serializers.SerializerMethodField()

    class Meta:
        model = ServiceBooking

        fields = [
            "id",
            "service_request",
            "quotation",
            "request_title",

            "customer",
            "provider_profile",
            "provider_id",
            "provider_name",
            "business_name",

            "final_price",
            "quotation_price",

            "scheduled_date",
            "scheduled_start_time",
            "scheduled_end_time",

            "status",
            "cancellation_reason",

            "created_at",
            "updated_at",
            "completed_at",
            "has_review",
            "review_id",
        ]

        read_only_fields = [
            "id",
            "service_request",
            "quotation",
            "customer",
            "provider_profile",
            "final_price",
            "status",
            "cancellation_reason",
            "created_at",
            "updated_at",
            "completed_at",
        ]

    def get_provider_name(self, obj):
        user = obj.provider_profile.provider

        return (
            user.get_full_name()
            or user.username
            or user.email
        )

    def get_has_review(self, obj):
       return hasattr(obj, "review")


def get_review_id(self, obj):
    if hasattr(obj, "review"):
        return obj.review.id

    return None

from django.db.models import Avg


class ServiceReviewSerializer(serializers.ModelSerializer):

    customer_name = serializers.SerializerMethodField()

    provider_id = serializers.IntegerField(
        source="provider_profile.provider.id",
        read_only=True,
    )

    provider_name = serializers.SerializerMethodField()

    business_name = serializers.CharField(
        source="provider_profile.business_name",
        read_only=True,
    )

    class Meta:
        model = ServiceReview

        fields = [
            "id",
            "booking",
            "customer",
            "customer_name",
            "provider_profile",
            "provider_id",
            "provider_name",
            "business_name",
            "rating",
            "review",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "booking",
            "customer",
            "provider_profile",
            "provider_id",
            "provider_name",
            "business_name",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        return (
            obj.customer.get_full_name()
            or obj.customer.username
            or obj.customer.email
        )

    def get_provider_name(self, obj):
        user = obj.provider_profile.provider

        return (
            user.get_full_name()
            or user.username
            or user.email
        )

    def validate_rating(self, value):

        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value

class ServiceNotificationSerializer(serializers.ModelSerializer):

    service_request_id = serializers.SerializerMethodField()
    booking_id = serializers.SerializerMethodField()

    class Meta:
        model = ServiceNotification

        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "service_request_id",
            "booking_id",
            "is_read",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "service_request_id",
            "booking_id",
            "is_read",
            "created_at",
        ]

    def get_service_request_id(self, obj):

        if not obj.service_request_id:
            return None

        return str(obj.service_request_id)

    def get_booking_id(self, obj):

        if not obj.booking_id:
            return None

        return obj.booking_id
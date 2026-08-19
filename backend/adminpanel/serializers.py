from rest_framework import serializers

from .models import SpotlightImage


class SpotlightImageSerializer(serializers.ModelSerializer):

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SpotlightImage

        fields = [
            "id",
            "title",
            "subtitle",
            "image",
            "image_url",
            "redirect_url",
            "display_order",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "image_url",
            "created_at",
            "updated_at",
        ]

    def get_image_url(self, obj):

        if not obj.image:
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(
                obj.image.url
            )

        return obj.image.url

    def validate_image(self, image):

        allowed_types = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ]

        content_type = getattr(
            image,
            "content_type",
            None,
        )

        if content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only JPG, JPEG, PNG and WEBP images are allowed."
            )

        # Maximum 10 MB
        max_size = 10 * 1024 * 1024

        if image.size > max_size:
            raise serializers.ValidationError(
                "Spotlight image size cannot exceed 10 MB."
            )

        return image

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from .models import AdminPermissionProfile


User = get_user_model()


class AdminPermissionProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = AdminPermissionProfile

        fields = [
            "manage_providers",
            "manage_customers",
            "manage_services",
            "manage_bookings",
            "manage_quotes",
            "view_reports",
            "manage_spotlights",
            "manage_admin_users",
        ]


class AdminUserSerializer(serializers.ModelSerializer):

    permissions = AdminPermissionProfileSerializer(
        source="admin_permission_profile",
        read_only=True,
    )

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User

        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "is_staff",
            "is_superuser",
            "is_active",
            "date_joined",
            "permissions",
        ]

        read_only_fields = [
            "id",
            "is_superuser",
            "date_joined",
        ]

    def get_full_name(self, obj):
        return (
            obj.get_full_name()
            or obj.username
        )


class CreateAdminUserSerializer(serializers.Serializer):

    username = serializers.CharField(
        required=True,
        max_length=150,
    )

    email = serializers.EmailField(
        required=True,
    )

    password = serializers.CharField(
        required=True,
        write_only=True,
    )

    first_name = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    last_name = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    permissions = AdminPermissionProfileSerializer(
        required=True,
    )

    def validate_username(self, value):

        if User.objects.filter(
            username__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "Username already exists."
            )

        return value

    def validate_email(self, value):

        if User.objects.filter(
            email__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "Email already exists."
            )

        return value.lower()

    def validate_password(self, value):

        validate_password(value)

        return value

    def create(self, validated_data):

        permissions_data = validated_data.pop(
            "permissions"
        )

        password = validated_data.pop(
            "password"
        )

        user = User(
            **validated_data
        )

        # Admin account configuration
        user.role = "admin"
        user.is_staff = True
        user.is_superuser = False
        user.is_active = True

        # Admin accounts do not go through
        # normal customer email verification.
        user.is_email_verified = True

        # Hash password correctly
        user.set_password(password)

        user.save()

        # Create permission profile
        AdminPermissionProfile.objects.create(
            user=user,
            **permissions_data,
        )

        return user


class UpdateAdminUserSerializer(serializers.Serializer):

    first_name = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    last_name = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    email = serializers.EmailField(
        required=False,
    )

    permissions = AdminPermissionProfileSerializer(
        required=False,
    )

    def validate_email(self, value):

        user = self.context["user"]

        if (
            User.objects
            .filter(
                email__iexact=value
            )
            .exclude(
                id=user.id
            )
            .exists()
        ):
            raise serializers.ValidationError(
                "Email already exists."
            )

        return value.lower()

    def update(self, instance, validated_data):

        permissions_data = validated_data.pop(
            "permissions",
            None,
        )

        for field, value in validated_data.items():
            setattr(
                instance,
                field,
                value,
            )

        instance.save()

        if permissions_data is not None:

            permission_profile, _ = (
                AdminPermissionProfile.objects
                .get_or_create(
                    user=instance
                )
            )

            for field, value in permissions_data.items():
                setattr(
                    permission_profile,
                    field,
                    value,
                )

            permission_profile.save()

        return instance
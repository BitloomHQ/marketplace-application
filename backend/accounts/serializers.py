from rest_framework import serializers
from .models import User
from .helpers import active_service_keys, is_provider_role


class RegisterSerializer(serializers.ModelSerializer):

    class Meta:
        model = User

        fields = [
            'username',
            'email',
            'password',
            'phone',
            'role',
        ]

        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate_role(self, value):
        if value == 'customer':
            return value
        if value not in active_service_keys():
            raise serializers.ValidationError(
                'Invalid or inactive service type.',
            )
        return value

    def create(self, validated_data):

        password = validated_data.pop('password')
        role = validated_data.get('role', 'customer')

        user = User(**validated_data)

        if role == 'customer':
            user.is_approved = True
            user.is_verified = False
            user.is_active = True
        else:
            user.is_approved = False
            user.is_verified = False
            user.is_active = True

        user.set_password(password)
        user.save()

        return user
    

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


class ChangePasswordSerializer(serializers.Serializer):

    old_password = serializers.CharField(
        required=True,
        write_only=True
    )

    new_password = serializers.CharField(
        required=True,
        write_only=True
    )

    confirm_password = serializers.CharField(
        required=True,
        write_only=True
    )

    def validate_old_password(self, value):

        user = self.context["request"].user

        if not user.check_password(value):
            raise serializers.ValidationError(
                "Current password is incorrect."
            )

        return value

    def validate_new_password(self, value):

        user = self.context["request"].user

        validate_password(
            password=value,
            user=user
        )

        return value

    def validate(self, attrs):

        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "New password and confirm password do not match."
                    )
                }
            )

        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {
                    "new_password": (
                        "New password must be different from the current password."
                    )
                }
            )

        return attrs


from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils.http import urlsafe_base64_decode

User = get_user_model()


class ForgotPasswordSerializer(serializers.Serializer):

    email = serializers.EmailField(
        required=True
    )

    def validate_email(self, value):

        if not User.objects.filter(
            email__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "No account exists with this email address."
            )

        return value


class ResetPasswordSerializer(serializers.Serializer):

    uid = serializers.CharField(
        required=True
    )

    token = serializers.CharField(
        required=True
    )

    new_password = serializers.CharField(
        required=True,
        write_only=True
    )

    confirm_password = serializers.CharField(
        required=True,
        write_only=True
    )

    def validate_new_password(self, value):

        validate_password(value)

        return value

    def validate(self, attrs):

        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "New password and confirm password do not match."
                    )
                }
            )

        try:
            user_id = urlsafe_base64_decode(
                attrs["uid"]
            ).decode()

            user = User.objects.get(
                id=user_id
            )

        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist
        ):
            raise serializers.ValidationError(
                {
                    "uid": "Invalid password reset link."
                }
            )

        attrs["user"] = user

        return attrs

from rest_framework import serializers


class VerifyEmailOTPSerializer(serializers.Serializer):

    email = serializers.EmailField(
        required=True
    )

    otp = serializers.CharField(
        required=True,
        min_length=6,
        max_length=6,
        trim_whitespace=True
    )

    def validate_email(self, value):

        return value.strip().lower()

    def validate_otp(self, value):

        value = value.strip()

        if not value.isdigit():
            raise serializers.ValidationError(
                "OTP must contain exactly six digits."
            )

        return value


class ResendEmailOTPSerializer(serializers.Serializer):

    email = serializers.EmailField(
        required=True
    )

    def validate_email(self, value):

        return value.strip().lower()

from rest_framework import serializers

from accounts.models import User
from accounts.helpers import is_provider_role


class UserProfileSerializer(serializers.ModelSerializer):

    profile_picture_url = serializers.SerializerMethodField()
    is_provider = serializers.SerializerMethodField()
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
            "role",
            "phone",
            "address",
            "profile_picture",
            "profile_picture_url",
            "bio",
            "experience_years",
            "is_provider",
            "is_email_verified",
            "is_verified",
            "is_approved",
            "is_active",
            "status_note",
            "date_joined",
        ]

        read_only_fields = [
            "id",
            "username",
            "email",
            "role",
            "profile_picture",
            "is_email_verified",
            "is_verified",
            "is_approved",
            "is_active",
            "status_note",
            "date_joined",
        ]

    def get_profile_picture_url(self, obj):
        if not obj.profile_picture:
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(
                obj.profile_picture.url
            )

        return obj.profile_picture.url

    def get_is_provider(self, obj):
        if obj.is_superuser:
            return False

        return is_provider_role(obj.role)

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UpdateProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "phone",
            "address",
            "bio",
            "experience_years",
        ]

    def validate_phone(self, value):
        if not value:
            return value

        cleaned_phone = (
            value.replace(" ", "")
            .replace("-", "")
            .replace("+", "")
        )

        if not cleaned_phone.isdigit():
            raise serializers.ValidationError(
                "Phone number must contain only numbers."
            )

        if len(cleaned_phone) < 10 or len(cleaned_phone) > 15:
            raise serializers.ValidationError(
                "Phone number must contain between 10 and 15 digits."
            )

        return value

    def validate_experience_years(self, value):
        user = self.context["request"].user

        if not is_provider_role(user.role):
            return None

        if value is not None and value > 60:
            raise serializers.ValidationError(
                "Experience years cannot be greater than 60."
            )

        return value


class ProfileImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "profile_picture",
        ]

    def validate_profile_picture(self, image):
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

        max_size = 5 * 1024 * 1024

        if image.size > max_size:
            raise serializers.ValidationError(
                "Profile image size cannot exceed 5 MB."
            )

        return image
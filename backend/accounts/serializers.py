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

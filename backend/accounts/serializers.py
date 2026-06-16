from rest_framework import serializers
from .models import User


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

    def create(self, validated_data):

        password = validated_data.pop('password')

        user = User(**validated_data)

        user.set_password(password)

        if user.role == "customer":
            user.is_approved = True
            user.is_verified = False
            user.is_active = True

        else:
            user.is_approved = False
            user.is_verified = False
            user.is_active = True

        user.save()

        return user
from rest_framework import serializers

from services.models import ServiceCategory


class ServiceCategorySerializer(serializers.ModelSerializer):
    icon_url = serializers.SerializerMethodField()
    parent_name = serializers.CharField(
        source="parent.name",
        read_only=True,
    )

    class Meta:
        model = ServiceCategory
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "icon_url",
            "parent",
            "parent_name",
            "is_active",
            "display_order",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "slug",
            "created_at",
            "updated_at",
        ]

    def get_icon_url(self, obj):
        if not obj.icon:
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(
                obj.icon.url
            )

        return obj.icon.url
import json

from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        self.user = self.scope["user"]

        if self.user.is_anonymous:
            await self.close()
            return

        self.group_name = f"user_{self.user.id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name,
            )

    async def send_notification(self, event):

        payload = event.get("data") or event

        await self.send(
        text_data=json.dumps({
            "id": payload.get("id"),
            "notification_type": payload.get(
                "notification_type"
            ),
            "title": payload.get("title"),
            "message": payload.get("message"),
            "service_request_id": payload.get(
                "service_request_id"
            ),
            "booking_id": payload.get(
                "booking_id"
            ),
            "is_read": payload.get(
                "is_read",
                False,
            ),
            "created_at": payload.get(
                "created_at"
            ),
        })
    )
from django.shortcuts import render

# Create your views here.
import os
import uuid

from django.conf import settings
from django.core.files.storage import default_storage

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


ALLOWED_FOLDERS = [
    "profile_pictures",
    "service_categories",
    "provider_portfolio",
    "service_requests",
]


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_signed_upload_url(request):

    file_name = request.data.get("file_name")
    file_type = request.data.get("file_type")
    folder = request.data.get("folder")

    if not file_name or not file_type or not folder:
        return Response(
            {
                "success": False,
                "message": "file_name, file_type and folder are required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if folder not in ALLOWED_FOLDERS:
        return Response(
            {
                "success": False,
                "message": "Invalid upload folder"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not file_type.startswith("image/"):
        return Response(
            {
                "success": False,
                "message": "Only image files are allowed"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    ext = os.path.splitext(file_name)[1]

    file_key = f"{folder}/{uuid.uuid4()}{ext}"

    upload_url = request.build_absolute_uri("/api/uploads/local-upload/")

    file_url = request.build_absolute_uri(
        settings.MEDIA_URL + file_key
    )

    return Response({
        "success": True,
        "upload_url": upload_url,
        "file_key": file_key,
        "file_url": file_url,
        "method": "POST",
        "field_name": "file"
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def local_upload_file(request):

    file = request.FILES.get("file")
    file_key = request.data.get("file_key")

    if not file or not file_key:
        return Response(
            {
                "success": False,
                "message": "file and file_key are required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    folder = file_key.split("/")[0]

    if folder not in ALLOWED_FOLDERS:
        return Response(
            {
                "success": False,
                "message": "Invalid upload folder"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    saved_path = default_storage.save(
        file_key,
        file
    )

    file_url = request.build_absolute_uri(
        settings.MEDIA_URL + saved_path
    )

    return Response({
        "success": True,
        "file_key": saved_path,
        "file_url": file_url
    })
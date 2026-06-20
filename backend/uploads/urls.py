from django.urls import path
from .views import generate_signed_upload_url, local_upload_file

urlpatterns = [
    path(
        "generate-signed-url/",
        generate_signed_upload_url,
        name="generate_signed_upload_url"
    ),

    path(
        "local-upload/",
        local_upload_file,
        name="local_upload_file"
    ),
]
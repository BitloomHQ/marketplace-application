from django.conf import settings


def public_media_url(file_key: str) -> str:
    base = settings.MEDIA_URL.rstrip('/')
    file_key = file_key.lstrip('/')
    return f'{base}/{file_key}'


def use_s3_storage() -> bool:
    return getattr(settings, 'USE_S3', False)


def generate_s3_presigned_post(file_key: str, file_type: str) -> dict:
    import boto3

    client_kwargs = {
        'service_name': 's3',
        'region_name': settings.AWS_S3_REGION_NAME,
        'aws_access_key_id': settings.AWS_ACCESS_KEY_ID,
        'aws_secret_access_key': settings.AWS_SECRET_ACCESS_KEY,
    }
    endpoint_url = getattr(settings, 'AWS_S3_ENDPOINT_URL', '')
    if endpoint_url:
        client_kwargs['endpoint_url'] = endpoint_url

    client = boto3.client(**client_kwargs)
    return client.generate_presigned_post(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=file_key,
        Fields={'Content-Type': file_type},
        Conditions=[
            {'Content-Type': file_type},
            ['content-length-range', 1, 10 * 1024 * 1024],
        ],
        ExpiresIn=3600,
    )

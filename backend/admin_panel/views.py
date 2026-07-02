from django.db.models import Avg, Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status

from accounts.models import User, ProviderPortfolioImage
from accounts.helpers import media_url, provider_rating, serialize_service_category
from services.models import (
    ServiceCategory,
    ServiceRequest,
    Booking,
    Quote,
    Review,
)

from .permissions import IsAdminUser

PROVIDER_ROLES = ('gardener', 'electrician', 'plumber')


def admin_provider_payload(user, request):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'phone': user.phone,
        'address': user.address or '',
        'role': user.role,
        'bio': user.bio or None,
        'experience_years': user.experience_years,
        'is_active': user.is_active,
        'is_approved': user.is_approved,
        'is_verified': user.is_verified,
        'profile_picture': media_url(request, user.profile_picture),
        'date_joined': user.date_joined,
    }


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard(request):
    customers = User.objects.filter(role='customer')
    providers = User.objects.filter(role__in=PROVIDER_ROLES)
    services = ServiceCategory.objects.all()

    return Response({
        'success': True,
        'data': {
            'users': {
                'total_customers': customers.count(),
                'active_customers': customers.filter(is_active=True).count(),
                'inactive_customers': customers.filter(is_active=False).count(),
                'total_providers': providers.count(),
                'active_providers': providers.filter(is_active=True).count(),
                'inactive_providers': providers.filter(is_active=False).count(),
                'pending_providers': providers.filter(is_approved=False).count(),
                'approved_providers': providers.filter(is_approved=True).count(),
                'verified_providers': providers.filter(is_verified=True).count(),
            },
            'services': {
                'total_services': services.count(),
                'active_services': services.filter(status='active').count(),
                'coming_soon_services': services.filter(status='coming_soon').count(),
                'inactive_services': services.filter(status='inactive').count(),
            },
            'marketplace': {
                'total_requests': ServiceRequest.objects.count(),
                'total_quotes': Quote.objects.count(),
                'total_bookings': Booking.objects.count(),
                'completed_bookings': Booking.objects.filter(status='completed').count(),
                'cancelled_bookings': Booking.objects.filter(status='cancelled').count(),
                'total_reviews': Review.objects.count(),
            },
        },
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def pending_providers(request):
    providers = User.objects.filter(
        role__in=PROVIDER_ROLES,
        is_approved=False,
    ).order_by('-date_joined')

    return Response({
        'success': True,
        'providers': [admin_provider_payload(p, request) for p in providers],
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def approve_provider(request, provider_id):
    provider = User.objects.filter(id=provider_id, role__in=PROVIDER_ROLES).first()
    if not provider:
        return Response(
            {'success': False, 'message': 'Provider not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    provider.is_approved = True
    provider.is_verified = True
    provider.is_active = True
    provider.save()

    return Response({
        'success': True,
        'message': 'Provider approved successfully',
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def reject_provider(request, provider_id):
    provider = User.objects.filter(id=provider_id, role__in=PROVIDER_ROLES).first()
    if not provider:
        return Response(
            {'success': False, 'message': 'Provider not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    provider.is_approved = False
    provider.is_verified = False
    provider.is_active = False
    provider.save()

    return Response({
        'success': True,
        'message': 'Provider rejected/deactivated successfully',
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_services(request):
    services = ServiceCategory.objects.all().order_by('display_order', 'name')
    return Response({
        'success': True,
        'services': [serialize_service_category(s) for s in services],
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def create_service(request):
    name = request.data.get('name')
    key = request.data.get('key')
    description = request.data.get('description')

    if not name or not key or not description:
        return Response(
            {'success': False, 'message': 'name, key and description are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if ServiceCategory.objects.filter(key=key).exists():
        return Response(
            {'success': False, 'message': 'Service key already exists'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    status_value = request.data.get('status', 'active')
    if status_value not in ('active', 'inactive', 'coming_soon'):
        return Response(
            {'success': False, 'message': 'Invalid status'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    service = ServiceCategory.objects.create(
        name=name,
        key=key,
        description=description,
        icon=request.data.get('icon', '🔧'),
        status=status_value,
        start_date=request.data.get('start_date', ''),
        display_order=int(request.data.get('display_order', 0) or 0),
    )

    return Response({
        'success': True,
        'message': 'Service category created successfully',
        'service_id': service.id,
    })


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def update_service(request, service_id):
    service = ServiceCategory.objects.filter(id=service_id).first()
    if not service:
        return Response(
            {'success': False, 'message': 'Service not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    key = request.data.get('key')
    if key and ServiceCategory.objects.filter(key=key).exclude(id=service.id).exists():
        return Response(
            {'success': False, 'message': 'Service key already exists'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    for field in ('name', 'key', 'description', 'icon', 'status', 'start_date'):
        if field in request.data:
            setattr(service, field, request.data.get(field))
    if 'display_order' in request.data:
        service.display_order = int(request.data.get('display_order') or 0)

    service.save()
    return Response({
        'success': True,
        'message': 'Service category updated successfully',
    })


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_service(request, service_id):
    service = ServiceCategory.objects.filter(id=service_id).first()
    if not service:
        return Response(
            {'success': False, 'message': 'Service not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    service.delete()
    return Response({
        'success': True,
        'message': 'Service category deleted successfully',
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def all_providers(request):
    providers = User.objects.filter(role__in=PROVIDER_ROLES).order_by('-date_joined')
    return Response({
        'success': True,
        'providers': [admin_provider_payload(p, request) for p in providers],
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def activate_provider(request, provider_id):
    provider = User.objects.filter(id=provider_id, role__in=PROVIDER_ROLES).first()
    if not provider:
        return Response(
            {'success': False, 'message': 'Provider not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    provider.is_active = True
    provider.save()
    return Response({'success': True, 'message': 'Provider activated successfully'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def deactivate_provider(request, provider_id):
    provider = User.objects.filter(id=provider_id, role__in=PROVIDER_ROLES).first()
    if not provider:
        return Response(
            {'success': False, 'message': 'Provider not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    provider.is_active = False
    provider.save()
    return Response({'success': True, 'message': 'Provider deactivated successfully'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def verify_provider(request, provider_id):
    provider = User.objects.filter(id=provider_id, role__in=PROVIDER_ROLES).first()
    if not provider:
        return Response(
            {'success': False, 'message': 'Provider not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    provider.is_verified = True
    provider.save()
    return Response({'success': True, 'message': 'Provider verified successfully'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def unverify_provider(request, provider_id):
    provider = User.objects.filter(id=provider_id, role__in=PROVIDER_ROLES).first()
    if not provider:
        return Response(
            {'success': False, 'message': 'Provider not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    provider.is_verified = False
    provider.save()
    return Response({'success': True, 'message': 'Provider unverified successfully'})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def all_customers(request):
    customers = User.objects.filter(role='customer').order_by('-date_joined')
    return Response({
        'success': True,
        'customers': [
            {
                'id': c.id,
                'username': c.username,
                'email': c.email,
                'phone': c.phone,
                'address': c.address or '',
                'is_active': c.is_active,
                'date_joined': c.date_joined,
                'profile_picture': media_url(request, c.profile_picture),
            }
            for c in customers
        ],
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def activate_customer(request, customer_id):
    customer = User.objects.filter(id=customer_id, role='customer').first()
    if not customer:
        return Response(
            {'success': False, 'message': 'Customer not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    customer.is_active = True
    customer.is_approved = True
    customer.save()
    return Response({'success': True, 'message': 'Customer activated successfully'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def deactivate_customer(request, customer_id):
    customer = User.objects.filter(id=customer_id, role='customer').first()
    if not customer:
        return Response(
            {'success': False, 'message': 'Customer not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    customer.is_active = False
    customer.save()
    return Response({'success': True, 'message': 'Customer deactivated successfully'})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def all_requests(request):
    requests_qs = ServiceRequest.objects.select_related('customer', 'selected_provider').order_by('-created_at')
    return Response({
        'success': True,
        'requests': [
            {
                'id': sr.id,
                'customer_id': sr.customer_id,
                'customer': sr.customer.username,
                'service_type': sr.service_type,
                'address': sr.address,
                'lat': sr.lat,
                'lon': sr.lon,
                'description': sr.description,
                'status': sr.status,
                'is_booked': sr.is_booked,
                'selected_provider': sr.selected_provider.username if sr.selected_provider else None,
                'created_at': sr.created_at,
            }
            for sr in requests_qs
        ],
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def all_bookings(request):
    bookings = Booking.objects.select_related(
        'customer', 'provider', 'service_request',
    ).order_by('-created_at')

    return Response({
        'success': True,
        'bookings': [
            {
                'id': b.id,
                'service_request_id': b.service_request_id,
                'service_type': b.service_request.service_type,
                'customer_id': b.customer_id,
                'customer': b.customer.username,
                'provider_id': b.provider_id,
                'provider': b.provider.username,
                'final_price': b.final_price,
                'status': b.status,
                'created_at': b.created_at,
                'updated_at': b.updated_at,
            }
            for b in bookings
        ],
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def all_quotes(request):
    quotes = Quote.objects.select_related(
        'provider', 'service_request', 'service_request__customer',
    ).order_by('-created_at')

    return Response({
        'success': True,
        'quotes': [
            {
                'id': q.id,
                'service_request_id': q.service_request_id,
                'service_type': q.service_request.service_type,
                'customer': q.service_request.customer.username,
                'provider_id': q.provider_id,
                'provider': q.provider.username,
                'price': q.price,
                'message': q.message,
                'status': q.status,
                'created_at': q.created_at,
            }
            for q in quotes
        ],
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def provider_performance(request):
    providers = User.objects.filter(role__in=PROVIDER_ROLES).order_by('username')
    rows = []

    for provider in providers:
        total_quotes = Quote.objects.filter(provider=provider).count()
        accepted_quotes = Quote.objects.filter(provider=provider, status='accepted').count()
        total_bookings = Booking.objects.filter(provider=provider).count()
        completed_bookings = Booking.objects.filter(provider=provider, status='completed').count()
        cancelled_bookings = Booking.objects.filter(provider=provider, status='cancelled').count()
        average_rating, total_reviews = provider_rating(provider)

        acceptance_rate = round((accepted_quotes / total_quotes) * 100, 1) if total_quotes else 0.0
        completion_rate = round((completed_bookings / total_bookings) * 100, 1) if total_bookings else 0.0

        rows.append({
            'provider_id': provider.id,
            'provider': provider.username,
            'email': provider.email,
            'phone': provider.phone,
            'role': provider.role,
            'is_active': provider.is_active,
            'is_approved': provider.is_approved,
            'is_verified': provider.is_verified,
            'profile_picture': media_url(request, provider.profile_picture),
            'total_quotes': total_quotes,
            'accepted_quotes': accepted_quotes,
            'acceptance_rate': acceptance_rate,
            'total_bookings': total_bookings,
            'completed_bookings': completed_bookings,
            'cancelled_bookings': cancelled_bookings,
            'completion_rate': completion_rate,
            'total_reviews': total_reviews,
            'average_rating': average_rating,
        })

    return Response({
        'success': True,
        'providers': rows,
    })

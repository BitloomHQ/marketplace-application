from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CustomerServiceRequest
from .permissions import IsCustomerUser
from .serializers import CustomerServiceRequestSerializer


@api_view(["GET", "POST"])
@permission_classes([
    IsAuthenticated,
    IsCustomerUser,
])
def customer_service_request_list_create_api(request):
    if request.method == "GET":
        service_requests = (
            CustomerServiceRequest.objects
            .filter(customer=request.user)
            .select_related("category")
            .prefetch_related("images")
        )

        serializer = CustomerServiceRequestSerializer(
            service_requests,
            many=True,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "message": "Service requests fetched successfully.",
                "count": service_requests.count(),
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    serializer = CustomerServiceRequestSerializer(
        data=request.data,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Service request creation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    service_request = serializer.save(
        customer=request.user,
        status="open",
    )

    return Response(
        {
            "success": True,
            "message": "Service request created successfully.",
            "data": CustomerServiceRequestSerializer(
                service_request,
                context={"request": request},
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )
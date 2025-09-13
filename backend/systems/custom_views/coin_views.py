from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.response import Response
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from systems.models import (
    Coin
)
from rest_framework import permissions
# from systems.serializers

User = get_user_model()

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

class CoinListView(ListAPIView):
    pagination_class = StandardResultsSetPagination
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Coin.objects.values(
            "address", "ticker", "name",
            "image_url", "description",
            "score", "current_marketcap"
        ).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(page)
        return Response(queryset)

class TopCoinsView(APIView):
    """
    API for top coins by score
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 10))
            limit = max(1, min(limit, 100))  # Clamp between 1 and 100
        except ValueError:
            return Response({"detail": "Invalid limit"}, status=400)

        cache_key = f"top_coins_{limit}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        coins = list(
            Coin.objects.values(
                "address", "ticker", "name",
                "image_url", "description",
                "score", "current_marketcap"
            ).order_by("-score")[:limit]
        )
        cache.set(cache_key, coins, timeout=60)  # cache for 1 minute
        return Response(coins)

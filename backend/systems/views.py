from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.core.cache import cache
from django.db.models import F, ExpressionWrapper, FloatField, DecimalField, Prefetch
from django.db import connection

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError

from .models import (
    DeveloperScore, TraderScore, 
    CoinDRCScore, TraderHistory,
    Coin, UserCoinHoldings, Trade, SolanaUser,
    PriceApi, CoinHistory
)
from .serializers import (
    ConnectWalletSerializer, CoinHistorySerializer,
    CoinSerializer, UserCoinHoldingsSerializer, 
    TradeSerializer, #SolanaUserSerializer,
    TraderHistorySerializer, #CoinHolderSerializer
)
from .paginations import HistoryPagination
from .utils.coin_utils import get_coin_info, get_user_holdings_info
from .permissions import IsCronjobRequest
from .throttling import SolPriceThrottle

from datetime import timedelta
import requests
from decimal import Decimal

import asyncio
from adrf.views import APIView as aaview
from adrf.generics import ListAPIView as alaview
from asgiref.sync import sync_to_async
from django.db.models import Value, When, BooleanField, Case, CharField
from .utils.analyze import analysis
from .authenticate import CustomDashTokenAuth

User = get_user_model()

class RecalculateDailyScoresView(APIView):
    permission_classes = [IsCronjobRequest]

    def post(self, request):
        for drc in CoinDRCScore.objects.select_related('coin').all():
            drc.recalculate_score()
        #check
        # for devs in DeveloperScore.objects.filter(is_active=True).select_related('developer').all():
        #     devs.recalculate_score()
        for trds in TraderScore.objects.select_related('trader').all():
            trds.recalculate_score()
        return HttpResponse("OK")

class UpdateSolPriceView(APIView): # cron job
    permission_classes = [IsCronjobRequest]

    def post(self, request):
        instance, _ = PriceApi.objects.get_or_create(id=1)

        if instance.updated_at > now() - timedelta(minutes=4):
            return Response({"detail": "Price already fresh."})

        try:
            response = requests.get(
                "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
                timeout=2
            )
            print(response)
            response.raise_for_status()
            instance.sol_price = Decimal(response.json()["solana"]["usd"])
            instance.save()
            return Response({"detail": "Updated", "sol_price": str(instance.sol_price)})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class GetSolPriceView(APIView): # add a rate limit? per user auth
    throttle_classes = [SolPriceThrottle]
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        price = None
        
        try:
            price = cache.get("sol_price")
        except Exception as e:
            print("Redis unavailable: %s", e)

        if price is not None:
            return Response({"sol_price": price})

        try:
            instance = PriceApi.objects.only("sol_price").get(id=1)
            price = str(instance.sol_price)

            # Try to set cache (ignore failures)
            try:
                cache.set("sol_price", price, timeout=300)
            except Exception as e:
                print("Failed to cache price: %s", e)

            return Response({"sol_price": price})
        except PriceApi.DoesNotExist:
            return Response({"error": "No price yet."}, status=404)

class RestrictedViewset(viewsets.ModelViewSet):
    """
    API endpoint base class for ressiected views
    """
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'options']

class CoinViewSet(RestrictedViewset):
    """
    API endpoint for Coins
    """
    queryset = Coin.objects.all()
    serializer_class = CoinSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'address'
    
    @action(detail=False, methods=['get'], url_path='my-coins', permission_classes=[permissions.IsAuthenticated])
    def my_coins(self, request):
        """
        Return all coins created by the authenticated user.
        Assumes `request.user` is a SolanaUser or is linked to one.
        """
        coins = Coin.objects.filter(creator=request.user)
        serializer = self.get_serializer(coins, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"])
    def full_info(self, request, address=None):
        """
        Returns full coin info (all serializer fields), top holders, and recent history.
        """
        # 1️⃣ Coin info using serializer
        try:
            coin = Coin.objects.get(address=address)
        except Coin.DoesNotExist:
            return Response({"detail": "Coin not found"}, status=404)
        coin_data = CoinSerializer(coin).data

        # 2️⃣ Top holders (limit top 50)
        holders_qs = ( # how many queries
            UserCoinHoldings.objects.filter(coin=coin)
            .select_related("user", "user__trader_score")
            .annotate(
                wallet_address=F("user__wallet_address"),
                traderscore=F("user__trader_score__score"),
                held_percentage=ExpressionWrapper(
                    F("amount_held") * 100.0 / F("coin__total_supply"), output_field=FloatField()
                )
            )
            .values("wallet_address", "traderscore", "amount_held", "held_percentage")
            .order_by("-amount_held")[:50]
        )

        # 3️⃣ Recent history (paginated)
        history_qs = CoinHistory.objects.filter(coin=coin).order_by("-created_at")
        paginator = HistoryPagination()
        page = paginator.paginate_queryset(history_qs, request)
        history = list(page.values("created_at", "score", "description", 'key', 'id')) if page else []

        return Response({
            "coin": coin_data,
            "holders": list(holders_qs),
            "history": history,
        })

    # @action(detail=True, methods=["get"])
    # def trades(self, request, address=None):
    #     """Get all trades for a specific coin, optimized with .values()."""
    #     trades = Trade.objects.filter(coin__address=address).values(
    #         "transaction_hash",
    #         "trade_type",
    #         "coin_amount",
    #         "sol_amount",
    #         "created_at",
    #         "trading_fee",
    #     ).order_by("-created_at")
    #     return Response(list(trades))
    
    @action(detail=True, methods=['get'])
    def trades(self, request, address=None):
        """Get all trades for a specific coin"""
        coin = self.get_object()
        trades = coin.trades.all()
        serializer = TradeSerializer(trades, many=True)
        return Response(serializer.data)

class UserHolding(APIView):    
    def get_data(self, user):
        coinset = Coin.objects.filter(creator=user)
        usercoinholdings_set = (UserCoinHoldings.objects
            .filter(user=user)
            .select_related("coin")
            .annotate(
                value=ExpressionWrapper(
                    F("amount_held") * F("coin__current_price"),
                    output_field=DecimalField(max_digits=32, decimal_places=9),
                )
            )
        )
        created_coins = get_coin_info(coinset)
        held_coins, net_worth = get_user_holdings_info(usercoinholdings_set)

        return Response({
            "user": {
                "wallet_address": user.wallet_address,
                "display_name": user.get_display_name(),
                "bio": user.bio,
                "devscore": user.devscore,
                "tradescore": user.tradescore
            },
            "holdings": held_coins,
            "created_coins": created_coins,
            "number_of_created_coins": len(created_coins),
            "number_of_held_coins": len(held_coins),
            "net_worth": float(net_worth),
        })

class UserDashboardView(UserHolding): # 3 queries
    # join with developer score//
    authentication_classes = [CustomDashTokenAuth]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return self.get_data(user)

class PublicProfileCoinsView(UserHolding): # we can still check if the user is authenticaed sha -> an extra query
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        wallet_address = request.query_params.get('address')
        if not wallet_address:
            return Response({"detail": "Missing wallet address."}, status=400)

        user = SolanaUser.objects.filter(wallet_address=wallet_address).select_related("developer_score").first()
        return self.get_data(user)

class TradeViewSet(RestrictedViewset):
    """
    API endpoint for Trades
    """
    queryset = Trade.objects.all()
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]  # Will change to ReadOnly later
    lookup_field = 'id' # Should eventually be changed to transaction_hash
    http_method_names = ['get', 'options']

class ConnectWalletView(APIView): # edit
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ConnectWalletSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            # validation
            # send message
            # Create or get auth token
            token, _ = Token.objects.get_or_create(user=user)

            return Response({
                "message": "Connected successfully",
                "token": token.key,
                "wallet_address": user.wallet_address,
                "display_name": user.display_name,
                "bio": user.bio
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TraderHistoryListView(ListAPIView):
    serializer_class = TraderHistorySerializer
    pagination_class = HistoryPagination
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = TraderHistory.objects.all().order_by('-created_at')

        wallet = self.request.query_params.get('user')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')

        if wallet: # might make optional
            qs = qs.filter(user__wallet_address=wallet)
        else:
            qs = qs.filter(user=self.request.user)
        
        if year and month:
            qs = qs.filter(created_at__year=year, created_at__month=month)
        elif year:
            qs = qs.filter(created_at__year=year)
        elif month:
            qs = qs.filter(created_at__month=month)
        
        return qs

class CoinHistoryListView(ListAPIView):
    serializer_class = CoinHistorySerializer
    pagination_class = HistoryPagination
    permission_classes = [permissions.AllowAny]#IsAuthenticated]

    def get_queryset(self):
        qs = CoinHistory.objects.all().order_by('-created_at')

        coin_address = self.request.query_params.get('coin_address')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')

        if not coin_address:
            raise ValidationError({"coin_address": "This query parameter is required."})
        
        qs = qs.filter(coin__address=coin_address)
        
        if year and month:
            qs = qs.filter(created_at__year=year, created_at__month=month)
        elif year:
            qs = qs.filter(created_at__year=year)
        elif month:
            qs = qs.filter(created_at__month=month)
        
        return qs

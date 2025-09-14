from django.contrib.auth import get_user_model
from django.http import HttpResponse
from .permissions import IsCronjobRequest
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.core.cache import cache

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import ValidationError
# from django.db.models import F
from django.db.models import F, ExpressionWrapper, FloatField

from .models import (
    DeveloperScore, TraderScore, 
    CoinDRCScore, TraderHistory,
    Coin, UserCoinHoldings, Trade, SolanaUser,
    PriceApi, CoinHistory
)

from .serializers import (
    ConnectWalletSerializer, CoinHistorySerializer,
    CoinSerializer, UserCoinHoldingsSerializer, 
    TradeSerializer, SolanaUserSerializer,
    TraderHistorySerializer, CoinHolderSerializer
)

from datetime import timedelta
import requests
from decimal import Decimal
from .utils.coin_utils import get_coin_info, get_user_holdings

User = get_user_model()


class RecalculateDailyScoresView(APIView):
    permission_classes = [IsCronjobRequest]

    def post(self, request):
        for drc in CoinDRCScore.objects.select_related('coin').all():
            drc.recalculate_score()
        for devs in DeveloperScore.objects.select_related('developer').all():
            devs.recalculate_score()
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
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        price = cache.get("sol_price")
        if price is not None:
            return Response({"sol_price": price})

        try:
            instance = PriceApi.objects.only("sol_price").get(id=1)
            cache.set("sol_price", str(instance.sol_price), timeout=300)
            return Response({"sol_price": str(instance.sol_price)})
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
        holders_qs = (
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

class UserCoinHoldingsViewSet(RestrictedViewset): 
    """
    API endpoint for User Coin Holdings
    """
    queryset = UserCoinHoldings.objects.all()
    serializer_class = UserCoinHoldingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter to only show the current user's holdings unless staff"""
        if self.request.user.is_staff:
            return UserCoinHoldings.objects.all()
        return UserCoinHoldings.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'], url_path='my-coins', permission_classes=[permissions.IsAuthenticated])
    def my_coins(self, request):
        """
        Return all held data created by the authenticated user.
        Assumes `request.user` is a SolanaUser or is linked to one.
        """
        coins_held = UserCoinHoldings.objects.filter(user=request.user)
        include_market_cap = request.query_params.get('market_cap') == '1'

        serializer = self.serializer_class(
            coins_held,
            many=True,
            context=self.get_serializer_context(),
            include_market_cap=include_market_cap
        )
        return Response(serializer.data)

class UserDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        created_coins = get_coin_info(Coin.objects.filter(creator=user))
        held_coins, net_worth = get_user_holdings(user, include_market_cap=True, include_net_worth=True)

        return Response({
            "user": {
                "wallet_address": user.wallet_address,
                "display_name": user.get_display_name(),
                "bio": user.bio,
                "devscore": user.devscore,
                "tradescore": user.tradescore,
            },
            "holdings": held_coins,
            "created_coins": created_coins,
            "number_of_created_coins": len(created_coins),
            "number_of_held_coins": len(held_coins),
            "net_worth": float(net_worth),  # send as number to frontend
        })

class PublicProfileCoinsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        wallet_address = request.query_params.get('address')
        if not wallet_address:
            return Response({"detail": "Missing wallet address."}, status=400)

        user = get_object_or_404(SolanaUser, wallet_address=wallet_address)
        created_coins = get_coin_info(Coin.objects.filter(creator=user))
        held_coins, _ = get_user_holdings(user)
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
        })

class TradeViewSet(RestrictedViewset):
    """
    API endpoint for Trades
    """
    queryset = Trade.objects.all()
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]  # Will change to ReadOnly later
    lookup_field = 'id' # Should eventually be changed to transaction_hash
    http_method_names = ['get', 'options']

class UserViewSet(RestrictedViewset): # check later
    """
    API endpoint for Solana Users
    """
    queryset = SolanaUser.objects.all()
    serializer_class = SolanaUserSerializer
    permission_classes = [permissions.AllowAny]#permissions.IsAuthenticated]
    lookup_field = 'wallet_address'
    
    @action(detail=True, methods=['get'])
    def holdings(self, request, wallet_address=None):
        """Get all coin holdings for a specific user"""
        user = self.get_object()
        # Check permissions - users can only see their own holdings
        if user.wallet_address != request.user.wallet_address and not request.user.is_staff:
            return Response(
                {"error": "You don't have permission to view this user's holdings"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        holdings = user.holdings.all()
        serializer = UserCoinHoldingsSerializer(holdings, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def trades(self, request, wallet_address=None):
        """Get all trades for a specific user"""
        user = self.get_object()
        # Check permissions - users can only see their own trades
        if user.wallet_address != request.user.wallet_address and not request.user.is_staff:
            return Response(
                {"error": "You don't have permission to view this user's trades"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        trades = user.trades.all()
        serializer = TradeSerializer(trades, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def created_coins(self, request, wallet_address=None):
        """Get all coins created by a specific user"""
        user = self.get_object()
        coins = user.coins.all()
        from .serializers import CoinSerializer
        serializer = CoinSerializer(coins, many=True)
        return Response(serializer.data)

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

class HistoryPagination(PageNumberPagination):
    page_size = 20  # default items per page
    page_size_query_param = 'page_size'  # allow clients to override
    max_page_size = 100

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

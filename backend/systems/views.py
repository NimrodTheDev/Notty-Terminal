from django.contrib.auth import get_user_model
from django.http import HttpResponse
from .permissions import IsCronjobRequest

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.generics import RetrieveUpdateAPIView, ListAPIView
from rest_framework.views import APIView
from django.db.models import Q
from django.core.cache import cache

from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination

from .models import (
    DeveloperScore, TraderScore, 
    CoinDRCScore, TraderHistory,
    Coin, UserCoinHoldings, Trade, SolanaUser,
    PriceApi
)

from .serializers import (
    CoinDRCScoreSerializer, ConnectWalletSerializer,
    CoinSerializer, UserCoinHoldingsSerializer, 
    TradeSerializer, SolanaUserSerializer,
    TraderHistorySerializer, CoinHolderSerializer
)

from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404


from django.utils.timezone import now
from datetime import timedelta
import requests
from decimal import Decimal
from .models import PriceApi

User = get_user_model()

class TraderHistoryPagination(PageNumberPagination):
    page_size = 20  # default items per page
    page_size_query_param = 'page_size'  # allow clients to override
    max_page_size = 100

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

class GetSolPriceView(APIView):

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
    http_method_names = ['get', 'post', 'options']

    def perform_create(self, serializer):
        """Set user to current authenticated user"""
        serializer.save(creator=self.request.user)
    
    @action(detail=False, methods=['get'], url_path='top-coins')
    def top_coins(self, request):
        """Return top coins by score (cached)"""
        try:
            limit = int(request.query_params.get('limit', 10))
            limit = max(1, min(limit, 100))  # Clamp limit between 1 and 100
        except ValueError:
            return Response({'detail': 'Invalid limit value'}, status=400)
        
        cache_key = f'top_coins_{limit}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        coins = Coin.objects.order_by('-score')[:limit]
        serializer = self.get_serializer(coins, many=True)
        cache.set(cache_key, serializer.data, timeout=60)  # cache for 1 minute

        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='my-coins', permission_classes=[permissions.IsAuthenticated])
    def my_coins(self, request):
        """
        Return all coins created by the authenticated user.
        Assumes `request.user` is a SolanaUser or is linked to one.
        """
        coins = Coin.objects.filter(creator=request.user)
        serializer = self.get_serializer(coins, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def holders(self, request, address=None):
        """Get all holders of a specific coin"""
        coin = self.get_object()  # returns Coin instance

        # Optimized queryset for serializer
        holders = UserCoinHoldings.objects.filter(coin=coin)\
            .select_related('user', 'coin')\
            .only('user__wallet_address', 'amount_held', 'coin__total_supply')\
            .order_by('-amount_held')
        # display_name we can also add to check if available

        serializer = CoinHolderSerializer(holders, many=True)
        return Response(serializer.data)
    
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
        context = {'request': request}

        holdings = UserCoinHoldings.objects.filter(user=user).select_related("coin")
        created_coins = Coin.objects.filter(creator=user)  # add .only() if needed

        holdings_serializer = UserCoinHoldingsSerializer(
            holdings, many=True, context=context, include_market_cap=True
        )
        coins_serializer = CoinSerializer(
            created_coins, many=True, context=context
        )

        return Response({
            "user": {
                "wallet_address": user.wallet_address,
                "display_name": user.get_display_name(),
                "bio": user.bio,
                "devscore": user.devscore,
                "tradescore": user.tradescore
            },
            "holdings": holdings_serializer.data,
            "created_coins": coins_serializer.data
        })

class PublicProfileCoinsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        wallet_address = request.query_params.get('address')
        if not wallet_address:
            return Response({"detail": "Missing wallet address."}, status=400)

        user = get_object_or_404(SolanaUser, wallet_address=wallet_address)
        context = {'request': request}
        created_coins = Coin.objects.filter(creator=user)

        serializer = CoinSerializer(created_coins, many=True, context=context)
        return Response({
            "user": {
                "wallet_address": user.wallet_address,
                "display_name": user.get_display_name(),
                "bio": user.bio,
                "devscore": user.devscore,
                "tradescore": user.tradescore
            },
            "created_coins": serializer.data,
        })

class TradeViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Trades
    """
    queryset = Trade.objects.all()
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]  # Will change to ReadOnly later
    lookup_field = 'id' # Should eventually be changed to transaction_hash
    http_method_names = ['get', 'post', 'options']
    
    def perform_create(self, serializer):
        """Set user to current authenticated user"""
        coin_address = self.request.data.get("coin_address")
        if not coin_address:
            raise ValidationError("Missing coin_address")

        # Fetch coin from DB
        coin = get_object_or_404(Coin, address=coin_address)

        # Save the trade instance with coin and user
        serializer.save(user=self.request.user, coin=coin)

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

class ConnectWalletView(APIView):
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

class MeView(RetrieveUpdateAPIView):
    serializer_class = SolanaUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class CoinDRCScoreViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing coin DRC scores"""
    queryset = CoinDRCScore.objects.all().order_by('-score')
    serializer_class = CoinDRCScoreSerializer
    permission_classes = [permissions.AllowAny]#permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by minimum score
        min_score = self.request.query_params.get('min_score')
        if min_score and min_score.isdigit():
            queryset = queryset.filter(score__gte=int(min_score))
        
        # Filter by maximum score
        max_score = self.request.query_params.get('max_score')
        if max_score and max_score.isdigit():
            queryset = queryset.filter(score__lte=int(max_score))
        
        # Filter by coin address
        coin_address = self.request.query_params.get('coin')
        if coin_address:
            queryset = queryset.filter(coin__address__iexact=coin_address)
        
        # Filter by coin symbol
        coin_symbol = self.request.query_params.get('symbol')
        if coin_symbol:
            queryset = queryset.filter(coin__ticker__iexact=coin_symbol)
            
        # Filter by developer address
        developer = self.request.query_params.get('developer')
        if developer:
            queryset = queryset.filter(coin__creator__wallet_address__iexact=developer)
        
        # Filter by minimum age
        min_age = self.request.query_params.get('min_age_hours')
        if min_age and min_age.isdigit():
            queryset = queryset.filter(age_in_hours__gte=int(min_age))
        
        # Filter non-rugged coins only
        exclude_rugged = self.request.query_params.get('exclude_rugged')
        if exclude_rugged and exclude_rugged == 'true':
            queryset = queryset.filter(
                ~Q(coin__rug_flag__is_rugged=True)
            )
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def top_coins(self, request):
        """Returns top 10 coins by DRC score"""
        top_coins = self.get_queryset().filter(
            holders_count__gt=0
        ).exclude(
            coin__rug_flag__is_rugged=True
        )[:10]  # Assuming there's a drc_score field

        serializer = self.get_serializer(top_coins, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_coins(self, request):
        """Returns DRC scores for coins created by the authenticated user"""
        user_coins = self.get_queryset().filter(coin__creator=request.user)
        serializer = self.get_serializer(user_coins, many=True)
        return Response(serializer.data)

class TraderHistoryListView(ListAPIView):
    serializer_class = TraderHistorySerializer
    pagination_class = TraderHistoryPagination
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

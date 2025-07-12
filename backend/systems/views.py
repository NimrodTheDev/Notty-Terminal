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
)

from .serializers import (
    DeveloperScoreSerializer, TraderScoreSerializer, 
    CoinDRCScoreSerializer, ConnectWalletSerializer,
    CoinSerializer, UserCoinHoldingsSerializer, 
    TradeSerializer, SolanaUserSerializer,
    TraderHistorySerializer, CoinHolderSerializer
)

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
    # we want to create a way to get all the held coins of a user it has to be the person sending the request
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

        # holdings = UserCoinHoldings.objects.filter(user=user)
        # created_coins = Coin.objects.filter(creator=user)

        holdings = UserCoinHoldings.objects.filter(user=user).select_related("coin")
        created_coins = Coin.objects.filter(creator=user)  # add .only() if needed

        holdings_serializer = UserCoinHoldingsSerializer(
            holdings,
            many=True,
            context=context,
            include_market_cap=True
        )
        coins_serializer = CoinSerializer(
            created_coins,
            many=True,
            context=context
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

class TradeViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Trades
    """
    queryset = Trade.objects.all()
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]  # Will change to ReadOnly later
    lookup_field = 'id'  # Should eventually be changed to transaction_hash
    
    def perform_create(self, serializer):
        """Set user to current authenticated user"""
        serializer.save(user=self.request.user)
        
        # Update holdings after a trade
        coin = serializer.validated_data['coin']
        amount = serializer.validated_data['coin_amount']
        trade_type = serializer.validated_data['trade_type']
        
        # Get or create holdings for this user and coin
        holdings, created = UserCoinHoldings.objects.get_or_create(
            user=self.request.user,
            coin=coin,
            defaults={'amount_held': 0}
        )
        
        # Update holdings based on trade type
        if trade_type in ['BUY', 'COIN_CREATE']:
            holdings.amount_held += amount
        elif trade_type == 'SELL':
            if holdings.amount_held < amount:
                raise serializer.ValidationError("Not enough coins to sell")
            holdings.amount_held -= amount
            
        holdings.save()

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

# ViewSets
class DeveloperScoreViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing developer reputation scores"""
    queryset = DeveloperScore.objects.all().order_by('-score')
    serializer_class = DeveloperScoreSerializer
    permission_classes = []#permissions.IsAuthenticated]
    
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
        
        # Filter by developer address
        developer_address = self.request.query_params.get('developer')
        if developer_address:
            queryset = queryset.filter(developer__wallet_address__iexact=developer_address)
        
        # Filter to exclude rugged coins creators
        exclude_ruggers = self.request.query_params.get('exclude_ruggers')
        if exclude_ruggers and exclude_ruggers == 'true':
            queryset = queryset.filter(coins_rugged_count=0)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def top_developers(self, request):
        """Returns top 10 developers by score"""
        top_devs = self.get_queryset().filter(coins_created_count__gt=0)[:10]
        
        serializer = self.get_serializer(top_devs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_score(self, request):
        """Returns the authenticated user's developer score"""
        try:
            score = DeveloperScore.objects.get(developer=request.user)
            serializer = self.get_serializer(score)
            return Response(serializer.data)
        except DeveloperScore.DoesNotExist:
            return Response(
                {"detail": "No developer score found. Create a coin to establish your developer score."},
                status=status.HTTP_404_NOT_FOUND
            )

class TraderScoreViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing trader reputation scores"""
    queryset = TraderScore.objects.all().order_by('-score')
    serializer_class = TraderScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    
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
        
        # Filter by trader address
        trader_address = self.request.query_params.get('trader')
        if trader_address:
            queryset = queryset.filter(trader__wallet_address__iexact=trader_address)
        
        # Filter by minimum trading activity
        min_trades = self.request.query_params.get('min_trades')
        if min_trades and min_trades.isdigit():
            queryset = queryset.filter(trades_count__gte=int(min_trades))
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def top_traders(self, request):
        """Returns top 10 traders by score"""
        top_traders = self.get_queryset().filter(trades_count__gt=5)[:10]
        serializer = self.get_serializer(top_traders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_score(self, request):
        """Returns the authenticated user's trader score"""
        try:
            score = TraderScore.objects.get(trader=request.user)
            serializer = self.get_serializer(score)
            return Response(serializer.data)
        except TraderScore.DoesNotExist:
            return Response(
                {"detail": "No trader score found. Make trades to establish your trader score."},
                status=status.HTTP_404_NOT_FOUND
            )

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
    
    @action(detail=True, methods=['post'])
    def verify_contract(self, request, pk=None):
        """Mark a coin's contract as verified"""
        coin_drc = self.get_object()
        
        # Check if user is the coin creator or an admin
        if request.user != coin_drc.coin.creator and not request.user.is_staff:
            return Response(
                {"detail": "You don't have permission to verify this contract"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        coin_drc.verified_contract = True
        coin_drc.save()
        coin_drc.recalculate_score()
        
        serializer = self.get_serializer(coin_drc)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_audit(self, request, pk=None):
        """Update audit status and score for a coin"""
        coin_drc = self.get_object()
        
        # Check if user is an admin (only admins can update audit status)
        if not request.user.is_staff:
            return Response(
                {"detail": "Only admins can update audit status"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get audit parameters from request
        completed = request.data.get('completed', False)
        score = request.data.get('score', 0)
        
        try:
            score = int(score)
            if score < 0 or score > 100:
                return Response(
                    {"detail": "Audit score must be between 0 and 100"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {"detail": "Audit score must be an integer"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Update audit info
        coin_drc.audit_completed = completed
        coin_drc.audit_score = score
        coin_drc.save()
        coin_drc.recalculate_score()
        
        serializer = self.get_serializer(coin_drc)
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

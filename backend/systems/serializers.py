from rest_framework import serializers
from .models import (
    DeveloperScore, 
    SolanaUser,
    Coin,UserCoinHoldings, 
    Trade, TraderHistory, CoinHistory
)

class SolanaUserSerializer(serializers.ModelSerializer): # we should always select_relations in user 
    devscore = serializers.SerializerMethodField()
    tradescore = serializers.SerializerMethodField()

    class Meta:
        model = SolanaUser
        fields = ['wallet_address', 'display_name', 'bio', 'devscore', 'tradescore']
        read_only_fields = ['wallet_address']

    def get_devscore(self, obj):
        return obj.devscore
    
    def get_tradescore(self, obj):
        return obj.tradescore

class ConnectWalletSerializer(serializers.Serializer):
    wallet_address = serializers.CharField()
    display_name = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        wallet = data.get("wallet_address")
        user, _ = SolanaUser.objects.get_or_create(
            wallet_address=wallet,
            defaults={
                "display_name": data.get("display_name", ""),
                "bio": data.get("bio", ""),
            }
        )
        data['user'] = user
        return data

class CoinSerializer(serializers.ModelSerializer):
    creator_display_name = serializers.SerializerMethodField()
    marketcap = serializers.SerializerMethodField()
    
    class Meta:
        model = Coin
        fields = [
            'address', 'ticker', 'name', 'creator', 'creator_display_name',
            'created_at', 'total_supply', 'image_url',
            'description', 'discord', 'website', 'twitter',
            'current_price', 'total_held', 'score',
            'decimals', 'bonding_curve',
            'current_marketcap', 'start_marketcap', 'end_marketcap', 
            'marketcap', 'change'
        ]
        read_only_fields = ['creator', 'creator_display_name', 'created_at']
    
    def get_creator_display_name(self, obj):
        return obj.creator.get_display_name()
    
    def get_marketcap(self, obj):
        return obj.current_marketcap

class UserCoinHoldingsSerializer(serializers.ModelSerializer): # we need to select_relationship on ths too
    coin_ticker = serializers.ReadOnlyField(source='coin.ticker')
    coin_name = serializers.ReadOnlyField(source='coin.name')
    current_price = serializers.ReadOnlyField(source='coin.current_price')
    value = serializers.SerializerMethodField()
    
    class Meta:
        model = UserCoinHoldings
        fields = ['user', 'coin', 'coin_ticker', 'coin_name', 'amount_held', 'current_price', 'value']
        read_only_fields = ['user', 'value']
    
    def __init__(self, *args, **kwargs):
        include_market_cap = kwargs.pop('include_market_cap', False)
        super().__init__(*args, **kwargs)
        if include_market_cap:
            self.fields['current_marketcap'] = serializers.SerializerMethodField()

    def get_value(self, obj):
        return float(obj.amount_held) * float(obj.coin.current_price)

    def get_current_marketcap(self, obj):
        return float(obj.coin.current_marketcap)

class TradeSerializer(serializers.ModelSerializer):
    coin_symbol = serializers.ReadOnlyField(source='coin.ticker')
    trade_type_display = serializers.SerializerMethodField()
   
    class Meta:
        model = Trade
        fields = [
            'transaction_hash', 'user', 'coin', 'coin_symbol', 'trade_type',
            'trade_type_display', 'coin_amount', 'sol_amount', 'created_at'
        ]
        read_only_fields = ['user', 'created_at', 'coin']
   
    def get_trade_type_display(self, obj):
        return obj.get_trade_type_display()
       
    def validate(self, data):
        """
        Validate the trade
        - For sells: check if user has enough coins
        - For buys: potentially check if there are enough coins available
        """
        if data['trade_type'] == 'SELL':  # If selling
            try:
                holdings = UserCoinHoldings.objects.get(
                    user=self.context['request'].user,
                    coin=data['coin']
                )
                if holdings.amount_held < data['coin_amount']:
                    raise serializers.ValidationError(
                        "Not enough coins to sell. You have {0} but are trying to sell {1}".format(
                            holdings.amount_held, data['coin_amount']
                        )
                    )
            except UserCoinHoldings.DoesNotExist:
                raise serializers.ValidationError("You don't own any of these coins to sell")
       
        return data

# drc
class DeveloperScoreSerializer(serializers.ModelSerializer):
    developer_address = serializers.CharField(source='developer.wallet_address', read_only=True)
    
    class Meta:
        model = DeveloperScore
        fields = [
            'developer_address', 'score', 'coins_created_count', 
            'coins_active_24h_plus', 'coins_rugged_count', 
            'highest_market_cap', 'created_at', 'updated_at'
        ]

# history
class TraderHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TraderHistory
        fields = ['id', 'key', 'score', 'created_at', 'description', 'user']

# needs to be simpler and faster
class CoinHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CoinHistory
        fields = ['id', 'key', 'score', 'created_at', 'description', 'coin']

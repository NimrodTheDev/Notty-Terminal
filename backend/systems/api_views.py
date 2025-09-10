from rest_framework.views import APIView
from .models import Coin
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from .models import SolanaUser

class PriceView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        coin_address = request.data.get("coin_address")
        coin = Coin.objects.filter(address=coin_address).first()
        if not coin:
            Response({"error": "Coin not found."}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"price": coin.current_price}, status.HTTP_200_OK)

class ConnectBotWalletView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        wallet = request.data.get("wallet_address")
        if not wallet:
            return Response({"error": "wallet address not found."}, status=status.HTTP_400_BAD_REQUEST)
        user, _ = SolanaUser.objects.get_or_create(
            wallet_address=wallet,
            defaults={
                "display_name": request.data.get("display_name", ""),
                "bio": request.data.get("bio", ""),
            }
        )
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "wallet_address": user.wallet_address,
        }, status=status.HTTP_200_OK)

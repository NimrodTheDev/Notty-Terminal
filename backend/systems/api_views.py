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
        coin_address = request.query_params.get("coin_address")
        if not coin_address:
            return Response({"error": "Coin address not found."}, status=status.HTTP_400_BAD_REQUEST)
        price = Coin.objects.filter(address=coin_address).values_list("current_price", flat=True).first()
        if price is None:
            return Response({"error": "Coin not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"price": price}, status.HTTP_200_OK)

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

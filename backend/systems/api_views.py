from rest_framework.views import APIView
from .models import Coin
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

class PriceView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        coin_address = request.data.get("coin_address")
        coin = Coin.objects.filter(address=coin_address).first()
        if not coin:
            Response({"error": "Coin not found."}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"price": coin.current_price}, status.HTTP_200_OK)

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from django.http import HttpResponse

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'coins', views.CoinViewSet)
router.register(r'holdings', views.UserCoinHoldingsViewSet)
router.register(r'trades', views.TradeViewSet)
# drc stuff
router.register(r'developer-scores', views.DeveloperScoreViewSet)
router.register(r'trader-scores', views.TraderScoreViewSet)
router.register(r'coin-scores', views.CoinDRCScoreViewSet)
router.register(r'rug-flags', views.CoinRugFlagViewSet)

auth_urls = [
    path("connect_wallet/", views.ConnectWalletView.as_view(), name="connect_wallet"),
    path("me/", views.MeView.as_view(), name="me"),
]

urlpatterns = [
    path("api/", include(auth_urls)),
    path("api/", include(router.urls)),
    path('alive-api/', lambda request: HttpResponse("OK")),
]

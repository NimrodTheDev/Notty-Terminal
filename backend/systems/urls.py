from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import api_views
from django.http import HttpResponse

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'coins', views.CoinViewSet)
router.register(r'holdings', views.UserCoinHoldingsViewSet)
router.register(r'trades', views.TradeViewSet)

auth_urls = [
    path("connect_wallet/", views.ConnectWalletView.as_view(), name="connect_wallet"),
    path("recalculate-scores/", views.RecalculateDailyScoresView.as_view(), name="recalculate-scores"),
    path('trader-history/', views.TraderHistoryListView.as_view(), name='trader-history-list'),
    path('coin-history/', views.CoinHistoryListView.as_view(), name='coin-history-list'),
    path('dashboard/', views.UserDashboardView.as_view(), name='user-dashboard'),
    path('dashboard/profile/', views.PublicProfileCoinsView.as_view(), name='user-profile-coins'),
    path('sol-price/',views.GetSolPriceView.as_view(), name='sol-price'),
]

bot_urls = [
    path("get-price/", api_views.PriceView.as_view(), name="get-price"),
    path("connect-bot/", api_views.ConnectBotWalletView.as_view(), name="connect-bot"),
    path("list-coins/", api_views.CoinListView.as_view(), name="list-coins"),
]

urlpatterns = [
    path("bot_api/", include(bot_urls)),
    path("api/", include(auth_urls)),
    path("api/", include(router.urls)),
    path('alive-api/', lambda request: HttpResponse("OK")),
    path('update-sol-price/', views.UpdateSolPriceView.as_view()),
]

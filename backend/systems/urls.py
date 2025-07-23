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
router.register(r'coin-scores', views.CoinDRCScoreViewSet)

auth_urls = [
    path("connect_wallet/", views.ConnectWalletView.as_view(), name="connect_wallet"),
    path("me/", views.MeView.as_view(), name="me"),
    path("recalculate-scores/", views.RecalculateDailyScoresView.as_view(), name="recalculate-scores"),
    path('trader-history/', views.TraderHistoryListView.as_view(), name='trader-history-list'),
    path('dashboard/', views.UserDashboardView.as_view(), name='user-dashboard'),
]

urlpatterns = [
    path("api/", include(auth_urls)),
    path("api/", include(router.urls)),
    path('alive-api/', lambda request: HttpResponse("OK")),
]

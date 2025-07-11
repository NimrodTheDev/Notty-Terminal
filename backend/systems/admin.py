from django.contrib import admin
from .models import (
    SolanaUser, Coin, CoinDRCScore, 
    DeveloperScore, TraderScore, 
    UserCoinHoldings, Trade,
    TraderHistory
)

class SolanaUserAdmin(admin.ModelAdmin):
    """Admin interface for SolanaUser"""
    
    # Display these fields in the list view
    list_display = ('wallet_address', 'display_name', 'is_staff', 'is_superuser', 'bio')
    
    # Add search functionality
    search_fields = ('wallet_address', 'display_name', 'bio')
    
    # Allow filtering by admin status
    list_filter = ('is_staff', 'is_superuser')

    # Set the fieldsets for the form view
    fieldsets = (
        (None, {'fields': ('wallet_address', 'display_name', 'bio')}),
        ('Permissions', {'fields': ('is_staff', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login',)}),
    )
    
    # Optionally make certain fields read-only
    readonly_fields = ('last_login',)

admin.site.register(SolanaUser, SolanaUserAdmin)
admin.site.register(Coin)
admin.site.register(DeveloperScore)
admin.site.register(TraderScore)
admin.site.register(CoinDRCScore)
admin.site.register(UserCoinHoldings)
admin.site.register(Trade)
admin.site.register(TraderHistory)
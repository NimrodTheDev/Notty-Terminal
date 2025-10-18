from django.db import models
from django.utils.translation import gettext_lazy as _
from systems.utils.logger import log_trader_history, TraderKey # add developer stuffs to it
from ..main import *
from .score import DRCScore

class DeveloperScore(DRCScore): # the system will eventually have to leave here
    """
    Developer reputation score tracking for Solana users who create coins
    """
    developer = models.OneToOneField(
        SolanaUser,
        on_delete=models.CASCADE,
        related_name='developer_score',
        to_field="wallet_address"
    )
    
    # new meteric
    successful_launch = models.IntegerField(default=0) # +100 # tricky
    abandoned_projects = models.IntegerField(default=0) # -150 # check in drs score if the token is adandoned
    rug_pull_or_sell_off = models.IntegerField(default=0) # -100 no rug pull + 100 how to check rug pull - coin count
    no_rugs_count = models.IntegerField(default=0) # -100 no rug pull + 100 how to check rug pull - coin count
    is_active = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['score']),
            models.Index(fields=['developer']),
        ]
    
    def __str__(self):
        return f"Dev Score for {self.developer.wallet_address}: {self.score}"
    
    def recalculate_score(self, activate:bool = False): # determining success
        # can add an activate argument that activates the that way we are only send one db request
        """
        Calculate developer reputation based on their coin creation history
        """
        base_score = 150
        update_fields = [
            'score', 'successful_launch', 'abandoned_projects',
            'no_rugs_count',
            # 'updated_at'
        ]
        if not self.is_active:
            if not activate: return base_score
            self.is_active = True
            update_fields.append("is_active")

        # Get all coins created by this developer
        self.abandoned_count = self.developer.coins.filter(drc_score__token_abandonment=True).count() * 150 
        # (this is wrong) the recalculation instead it should be, optmized 
        self.rug_pull_or_sell_off_count = self.developer.coins.filter(drc_score__team_abandonment=True).count() *100
        # self.no_rugs_count = self.developer.coins.filter(drc_score__team_abandonment=False).count() *100 # add when discussed
        self.successful_launch_count = self.developer.coins.filter(drc_score__successful_token=True).count() * 200

        # Calculate final score with clamping
        total_score = base_score + self.successful_launch_count -(self.abandoned_count+self.rug_pull_or_sell_off_count)
        self.score = max(total_score, 0)
        self.save(update_fields=update_fields)
        
        return self.score
    
    def get_score_breakdown(self) -> dict:
        """
        Returns a dictionary showing the breakdown of how the score was calculated.
        """
        base_score = 150

        # Calculate each factor again (same as in recalculate_score)
        abandoned_count = self.developer.coins.filter(drc_score__token_abandonment=True).count()
        rug_pull_count = self.developer.coins.filter(drc_score__team_abandonment=True).count()
        successful_launch_count = self.developer.coins.filter(drc_score__successful_token=True).count()
        no_rugs_count = self.developer.coins.filter(drc_score__team_abandonment=False).count()

        # Compute individual scores
        abandoned_score = abandoned_count * 150
        rug_pull_score = rug_pull_count * 100
        successful_launch_score = successful_launch_count * 100
        no_rugs_score = no_rugs_count * 100

        total_score = base_score + successful_launch_score - (abandoned_score + rug_pull_score)

        return {
            "base_score": base_score,
            "successful_launches": {
                "count": successful_launch_count,
                "score": successful_launch_score,
            },
            "abandoned_projects": {
                "count": abandoned_count,
                "penalty": abandoned_score,
            },
            "rug_pulls_or_sell_offs": {
                "count": rug_pull_count,
                "penalty": rug_pull_score,
            },
            "no_rug_tokens": {
                "count": no_rugs_count,
                "bonus": no_rugs_score,
            },
            "final_score": max(total_score, 0),
        }

from django.db import models

class DRCScore(models.Model):
    """Base model for DRC scoring with common fields"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    score = models.IntegerField(default=150)
    last_monthly_update = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        abstract = True
    
    @property
    def rank(self):
        match self.score:
            case x if x < 150:
                return 1
            case x if x < 500:
                return 2
            case x if x < 1000:
                return 3
            case x if x < 2000:
                return 4
            case x if x >= 2000:
                return 5

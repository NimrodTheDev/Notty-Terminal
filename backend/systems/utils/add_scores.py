from django.db import transaction
from systems.models import SolanaUser, DeveloperScore

@transaction.atomic
def ensure_all_developer_scores():
    """
    Ensures every SolanaUser has a DeveloperScore.
    Creates missing ones efficiently.
    """
    users_without_score = SolanaUser.objects.filter(developer_score__isnull=True)

    new_scores = [
        DeveloperScore(developer=user)
        for user in users_without_score
    ]

    DeveloperScore.objects.bulk_create(new_scores, ignore_conflicts=True)

    return len(new_scores)

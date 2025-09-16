from rest_framework.throttling import UserRateThrottle

class SolPriceThrottle(UserRateThrottle):
    rate = "10/min"  # e.g. 10 requests per minute per user

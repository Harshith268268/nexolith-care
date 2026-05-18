from django.urls import path
from .views import InsightsView, RiskSummaryView, MemberTrendsView, ChatAssistantView, PredictionsView

urlpatterns = [
    path('insights/', InsightsView.as_view(), name='analytics-insights'),
    path('risk-summary/', RiskSummaryView.as_view(), name='analytics-risk-summary'),
    path('member-trends/', MemberTrendsView.as_view(), name='analytics-member-trends'),
    path('assistant/', ChatAssistantView.as_view(), name='analytics-assistant'),
    path('predictions/', PredictionsView.as_view(), name='analytics-predictions'),
]

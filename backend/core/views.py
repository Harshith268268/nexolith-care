import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection
from django.conf import settings
from services.medical_analyzer import MedicalAnalyzer

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    Public Health Check Endpoint for monitoring system health,
    database connectivity, and local ML model availability.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        health_status = {
            "status": "healthy",
            "service": "Nexolith Care API",
            "version": "1.0.0",
            "database": "disconnected",
            "database_engine": connection.vendor,
            "database_name": connection.settings_dict.get("NAME"),
            "mlModel": "unavailable",
            "debug": getattr(settings, 'DEBUG', False)
        }

        # 1. Test Database Connectivity
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                health_status["database"] = "connected"
        except Exception as db_err:
            logger.error(f"Health check database error: {db_err}")
            health_status["database"] = f"error: {str(db_err)}"

        # 2. Test Local ML Model Availability
        try:
            analyzer = MedicalAnalyzer()
            if analyzer.is_ml_loaded:
                health_status["mlModel"] = "loaded (RandomForestClassifier)"
            else:
                health_status["mlModel"] = "heuristic_fallback"
        except Exception as ml_err:
            logger.error(f"Health check ML model error: {ml_err}")
            health_status["mlModel"] = f"error: {str(ml_err)}"

        return Response(health_status, status=200)

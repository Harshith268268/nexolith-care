import logging
import traceback
from rest_framework.views import APIView, exception_handler
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection
from django.conf import settings
from services.medical_analyzer import MedicalAnalyzer

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Global exception handler for DRF API views.
    Catches unhandled exceptions and logs details without crashing with unformatted HTML.
    """
    response = exception_handler(exc, context)
    if response is None:
        tb = traceback.format_exc()
        logger.error(f"Unhandled API Exception [{type(exc).__name__}]: {exc}\n{tb}")
        return Response({
            "error": "Internal Server Error",
            "detail": str(exc),
            "type": type(exc).__name__
        }, status=500)
    return response


class HealthCheckView(APIView):
    """
    Public Health Check Endpoint for monitoring system health,
    database connectivity, and local ML model availability without exposing secrets.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        health_status = {
            "status": "healthy",
            "service": "Nexolith Care REST API",
            "version": "1.0.0",
            "database": "disconnected",
            "mlModel": "unavailable",
        }

        # 1. Test Database Connectivity safely
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                health_status["database"] = "connected"
        except Exception as db_err:
            logger.error(f"Health check database query error: {db_err}")
            health_status["database"] = "error"
            health_status["status"] = "degraded"

        # 2. Test Local ML Model Availability
        try:
            analyzer = MedicalAnalyzer()
            if analyzer.is_ml_loaded:
                health_status["mlModel"] = "loaded"
            else:
                health_status["mlModel"] = "heuristic_fallback"
        except Exception as ml_err:
            logger.error(f"Health check ML model query error: {ml_err}")
            health_status["mlModel"] = "unavailable"

        http_status = 200 if health_status["status"] == "healthy" else 503
        return Response(health_status, status=http_status)

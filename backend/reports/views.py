import logging
from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Report
from .serializers import ReportSerializer
from services.ocr_processor import OCRProcessor
from services.medical_analyzer import MedicalAnalyzer

logger = logging.getLogger(__name__)


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Report.objects.filter(
            member__family__user=self.request.user
        ).order_by('-date')

    def perform_create(self, serializer):
        """
        On POST: Save the file, run OCR, run AI extraction, then persist.
        Falls back gracefully if no file is uploaded.
        """
        instance = serializer.save()  # Save to get the file path

        if instance.file:
            file_path = instance.file.path
            try:
                # Step 1: OCR
                logger.info(f"Running OCR on: {file_path}")
                ocr = OCRProcessor()
                raw_text = ocr.extract_text(file_path)
                instance.ocr_text = raw_text

                # Step 2: AI Extraction (Multimodal Vision)
                logger.info("Running AI multimodal vision analysis on file.")
                analyzer = MedicalAnalyzer()
                extracted = analyzer.analyze_report(ocr_text=raw_text, file_path=file_path)

                # Merge AI results into the instance
                if not instance.title or instance.title == 'Medical Report':
                    instance.title = extracted.get('title', instance.title)
                if extracted.get('type'):
                    instance.type = extracted['type']
                if extracted.get('abnormality'):
                    instance.abnormality = extracted['abnormality']
                if extracted.get('summary'):
                    instance.summary = extracted['summary']
                if extracted.get('lab_values'):
                    instance.lab_values = extracted['lab_values']

                instance.save()
                logger.info(f"Report {instance.id} processed successfully.")

                # Step 3: Run automatic Alert Generator
                try:
                    from alerts.alert_generator import MedicalAlertGenerator
                    alert_gen = MedicalAlertGenerator()
                    created_alerts = alert_gen.generate_alerts_for_report(instance)
                    logger.info(f"Generated {created_alerts} automatic alerts for report {instance.id}")
                except Exception as ae:
                    logger.error(f"Failed to auto-generate alerts: {ae}")

            except Exception as e:
                logger.error(f"OCR/AI processing failed for report {instance.id}: {e}")
                # Don't raise — the report is saved, just without extracted data

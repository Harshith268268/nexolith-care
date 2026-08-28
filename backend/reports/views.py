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
        On POST: Save the file, run OCR, run AI extraction, persist, generate alerts,
        and dispatch automatic email notification if abnormal/critical parameters exist.
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
                if extracted.get('report_date'):
                    try:
                        instance.date = extracted['report_date']
                    except Exception as de:
                        logger.error(f"Failed to parse report_date {extracted.get('report_date')}: {de}")
                if extracted.get('type'):
                    instance.type = extracted['type']
                if extracted.get('abnormality'):
                    instance.abnormality = extracted['abnormality']
                if extracted.get('summary'):
                    instance.summary = extracted['summary']
                if extracted.get('lab_values'):
                    instance.lab_values = extracted['lab_values']

                instance.save()
                instance.sync_parameters()
                logger.info(f"Report {instance.id} processed and parameters synced successfully.")

                # Step 3: Run automatic Alert Generator
                try:
                    from alerts.alert_generator import MedicalAlertGenerator
                    alert_gen = MedicalAlertGenerator()
                    created_alerts = alert_gen.generate_alerts_for_report(instance)
                    logger.info(f"Generated {created_alerts} automatic alerts for report {instance.id}")
                except Exception as ae:
                    logger.error(f"Failed to auto-generate alerts: {ae}")

                # Step 4: Dispatch automatic Email Notification for abnormal/critical alerts
                try:
                    from alerts.email_notifier import EmailAlertNotifier
                    notifier = EmailAlertNotifier()
                    sent_status = notifier.send_alert_email_for_report(instance)
                    logger.info(f"Email alert dispatch status for report {instance.id}: {sent_status}")
                except Exception as ee:
                    logger.error(f"Email alert notification failed for report {instance.id}: {ee}")

            except Exception as e:
                logger.error(f"OCR/AI processing failed for report {instance.id}: {e}")
                instance.sync_parameters()
        else:
            instance.sync_parameters()

            # For manually created/edited reports without files, check if alerts & emails are needed
            try:
                from alerts.alert_generator import MedicalAlertGenerator
                from alerts.email_notifier import EmailAlertNotifier
                created_alerts = MedicalAlertGenerator().generate_alerts_for_report(instance)
                EmailAlertNotifier().send_alert_email_for_report(instance)
            except Exception as ae:
                logger.error(f"Failed to generate alerts/emails for manual report {instance.id}: {ae}")

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.sync_parameters()

    def perform_destroy(self, instance):
        # Explicitly delete parameters and instance
        instance.parameters.all().delete()
        instance.delete()

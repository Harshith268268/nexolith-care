from django.contrib import admin
from .models import Report

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'member', 'type', 'abnormality', 'date', 'created_at')
    list_filter = ('type', 'abnormality', 'member', 'date')
    search_fields = ('title', 'member__name', 'summary')
    readonly_fields = ('ocr_text', 'lab_values', 'created_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('member', 'title', 'date', 'type', 'abnormality')
        }),
        ('Analysis Results', {
            'fields': ('summary', 'lab_values', 'ocr_text')
        }),
        ('Files & Notes', {
            'fields': ('file', 'doctor_notes', 'created_at')
        }),
    )

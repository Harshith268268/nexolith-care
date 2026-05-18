from django.contrib import admin
from .models import Alert

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'member', 'type', 'severity', 'status', 'date')
    list_filter = ('type', 'severity', 'status', 'member')
    search_fields = ('title', 'description', 'member__name')
    date_hierarchy = 'date'

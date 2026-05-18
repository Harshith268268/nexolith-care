from django.contrib import admin
from .models import Family, FamilyMember

@admin.register(Family)
class FamilyAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created_at')
    search_fields = ('user__username',)

@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'relation', 'age', 'family', 'created_at')
    list_filter = ('relation', 'family')
    search_fields = ('name', 'family__user__username')

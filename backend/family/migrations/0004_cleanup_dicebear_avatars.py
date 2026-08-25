from django.db import migrations

def remove_auto_generated_avatars(apps, schema_editor):
    FamilyMember = apps.get_model('family', 'FamilyMember')
    # Set avatar_url to None for all family members with dicebear or auto-generated URLs
    updated_count = FamilyMember.objects.filter(avatar_url__icontains='dicebear').update(avatar_url=None)
    print(f"Cleaned up {updated_count} auto-generated dicebear avatar(s) in PostgreSQL.")

def reverse_cleanup(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('family', '0003_familymember_gender_familymember_height_cm_and_more'),
    ]

    operations = [
        migrations.RunPython(remove_auto_generated_avatars, reverse_cleanup),
    ]

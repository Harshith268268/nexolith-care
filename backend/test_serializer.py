import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from family.serializers import FamilyMemberSerializer

data = {
    'name': 'jane doe',
    'age': 22,
    'relation': 'Dependent',
    'avatarUrl': 'https://i.pravatar.cc/150?u=jane doe'
}

# The camel case parser handles camelCase, so we pass snake_case to the serializer
data_snake = {
    'name': 'jane doe',
    'age': 22,
    'relation': 'Dependent',
    'avatar_url': 'https://i.pravatar.cc/150?u=jane doe'
}

serializer = FamilyMemberSerializer(data=data_snake)
if not serializer.is_valid():
    print(serializer.errors)
else:
    print("Valid!")

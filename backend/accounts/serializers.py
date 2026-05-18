from rest_framework import serializers
from django.contrib.auth.models import User
from family.models import Family

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        # Create a family profile for the new user automatically
        Family.objects.create(user=user)
        return user

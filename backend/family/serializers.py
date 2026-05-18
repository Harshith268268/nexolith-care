from rest_framework import serializers
from .models import Family, FamilyMember
from django.contrib.auth.models import User

class FamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = Family
        fields = ['id', 'user', 'created_at']

class FamilyMemberSerializer(serializers.ModelSerializer):
    family_id = serializers.PrimaryKeyRelatedField(read_only=True, source='family')
    avatar_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = FamilyMember
        fields = ['id', 'family_id', 'name', 'age', 'relation', 'avatar_url', 'created_at']

    def to_internal_value(self, data):
        # Gracefully map camelCase 'avatarUrl' to snake_case 'avatar_url'
        if 'avatarUrl' in data and 'avatar_url' not in data:
            data['avatar_url'] = data['avatarUrl']
        return super().to_internal_value(data)

    def create(self, validated_data):
        # Auto-generate a beautiful avatar if none was provided
        avatar = validated_data.get('avatar_url')
        if not avatar or not avatar.strip():
            name = validated_data.get('name', 'Default')
            validated_data['avatar_url'] = f"https://api.dicebear.com/7.x/adventurer/svg?seed={name}"
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Preserve the existing avatar if the updated avatar is not provided or blank
        if 'avatar_url' in validated_data and (not validated_data['avatar_url'] or not validated_data['avatar_url'].strip()):
            validated_data['avatar_url'] = instance.avatar_url
        elif 'avatar_url' not in validated_data:
            validated_data['avatar_url'] = instance.avatar_url
        return super().update(instance, validated_data)

    def validate_age(self, value):
        if value < 0:
            raise serializers.ValidationError("Age must be positive.")
        return value

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty.")
        return value

    def validate_relation(self, value):
        valid_roles = ['Primary', 'Dependent', 'Spouse', 'Parent', 'Other']
        if value not in valid_roles:
            raise serializers.ValidationError(f"Relation must be one of: {', '.join(valid_roles)}")
        return value

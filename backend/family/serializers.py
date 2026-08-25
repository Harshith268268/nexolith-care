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
    bmi = serializers.ReadOnlyField()

    class Meta:
        model = FamilyMember
        fields = [
            'id', 'family_id', 'name', 'gender', 'age',
            'height_cm', 'weight_kg', 'bmi', 'relation',
            'avatar_url', 'created_at'
        ]

    def to_internal_value(self, data):
        # Gracefully map camelCase fields to snake_case
        if 'avatarUrl' in data and 'avatar_url' not in data:
            data['avatar_url'] = data['avatarUrl']
        if 'heightCm' in data and 'height_cm' not in data:
            data['height_cm'] = data['heightCm']
        if 'weightKg' in data and 'weight_kg' not in data:
            data['weight_kg'] = data['weightKg']
        return super().to_internal_value(data)

    def create(self, validated_data):
        # Default avatar_url MUST be NULL in PostgreSQL unless explicitly uploaded
        avatar = validated_data.get('avatar_url')
        if not avatar or not str(avatar).strip() or str(avatar).lower() in ['null', 'none']:
            validated_data['avatar_url'] = None
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # If avatar_url is explicitly set to empty or null, set instance.avatar_url = None (NULL in DB)
        if 'avatar_url' in validated_data:
            avatar = validated_data.get('avatar_url')
            if not avatar or not str(avatar).strip() or str(avatar).lower() in ['null', 'none']:
                validated_data['avatar_url'] = None
        return super().update(instance, validated_data)

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty.")
        return value

    def validate_age(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Age must be a positive integer.")
        return value

    def validate_height_cm(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Height must be a positive value in centimeters.")
        return value

    def validate_weight_kg(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Weight must be a positive value in kilograms.")
        return value

    def validate_gender(self, value):
        if value and value not in ['Male', 'Female']:
            raise serializers.ValidationError("Gender must be Male or Female.")
        return value

    def validate_relation(self, value):
        valid_roles = ['Primary', 'Dependent', 'Spouse', 'Parent', 'Other']
        if value not in valid_roles:
            raise serializers.ValidationError(f"Relation must be one of: {', '.join(valid_roles)}")
        return value

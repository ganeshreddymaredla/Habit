from rest_framework import serializers
from .models import Habit, HabitLog
from .services import calculate_streak


class HabitLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = HabitLog
        fields = ('id', 'date', 'completed', 'note')


class HabitSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()
    last_completed = serializers.SerializerMethodField()
    completed_today = serializers.SerializerMethodField()
    grace_used  = serializers.BooleanField(read_only=True)
    grace_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Habit
        fields = ('id', 'name', 'description', 'category', 'created_at',
                  'stats', 'last_completed', 'completed_today', 'grace_used', 'grace_count')
        read_only_fields = ('id', 'created_at')

    def get_stats(self, obj):
        return calculate_streak(obj)

    def get_last_completed(self, obj):
        log = obj.logs.filter(completed=True).first()
        return log.date if log else None

    def get_completed_today(self, obj):
        from datetime import date
        from .services import get_today
        request = self.context.get('request')
        today = get_today(request) if request else date.today()
        return obj.logs.filter(date=today, completed=True).exists()


class HabitCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habit
        fields = ('id', 'name', 'description', 'category', 'created_at')
        read_only_fields = ('id', 'created_at')

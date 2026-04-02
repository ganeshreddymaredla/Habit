from django.db import models
from django.contrib.auth.models import User
from datetime import date, timedelta


class Habit(models.Model):
    CATEGORY_CHOICES = [
        ('health', 'Health'),
        ('fitness', 'Fitness'),
        ('learning', 'Learning'),
        ('mindfulness', 'Mindfulness'),
        ('productivity', 'Productivity'),
        ('other', 'Other'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='habits')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    created_at = models.DateTimeField(auto_now_add=True)

    # Grace-day streak fields
    current_streak      = models.IntegerField(default=0)
    last_completed_date = models.DateField(null=True, blank=True)
    grace_used          = models.BooleanField(default=False)
    grace_count         = models.IntegerField(default=0)  # lifetime grace uses (max 3)

    class Meta:
        unique_together = ('user', 'name')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.name}"

    def completed_today(self):
        return self.logs.filter(date=date.today(), completed=True).exists()

    def longest_streak(self):
        dates = sorted(self.logs.filter(completed=True).values_list('date', flat=True))
        if not dates:
            return 0
        longest = streak = 1
        for i in range(1, len(dates)):
            if dates[i] - dates[i - 1] == timedelta(days=1):
                streak += 1
                longest = max(longest, streak)
            else:
                streak = 1
        return longest


class HabitLog(models.Model):
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name='logs')
    date = models.DateField()
    completed = models.BooleanField(default=True)

    class Meta:
        unique_together = ('habit', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.habit.name} — {self.date} — {'✓' if self.completed else '✗'}"

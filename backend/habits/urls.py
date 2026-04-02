from django.urls import path
from .views import (
    HabitListCreateView, HabitDetailView,
    checkin, undo_checkin, habit_logs, save_note, day_summary, analytics, day_breakdown
)

urlpatterns = [
    path('habits/', HabitListCreateView.as_view(), name='habit-list'),
    path('habits/<int:pk>/', HabitDetailView.as_view(), name='habit-detail'),
    path('habits/<int:pk>/checkin/', checkin, name='habit-checkin'),
    path('habits/<int:pk>/undo/', undo_checkin, name='habit-undo'),
    path('habits/<int:pk>/logs/', habit_logs, name='habit-logs'),
    path('habits/<int:pk>/note/', save_note, name='habit-note'),
    path('day-summary/', day_summary, name='day-summary'),
    path('analytics/', analytics, name='analytics'),
    path('analytics/breakdown/', day_breakdown, name='day-breakdown'),
]

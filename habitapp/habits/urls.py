from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('habits/add/', views.add_habit, name='add_habit'),
    path('habits/<int:pk>/edit/', views.edit_habit, name='edit_habit'),
    path('habits/<int:pk>/delete/', views.delete_habit, name='delete_habit'),
    path('habits/<int:pk>/checkin/', views.checkin, name='checkin'),
    path('analytics/', views.analytics, name='analytics'),
    path('analytics/day/', views.day_breakdown_api, name='day_breakdown_api'),
]

from datetime import date, timedelta
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Habit, HabitLog
from .serializers import HabitSerializer, HabitCreateSerializer, HabitLogSerializer
from .services import calculate_streak, apply_grace_streak, get_today, build_daily_breakdown


class HabitListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Habit.objects.filter(user=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return HabitCreateSerializer
        return HabitSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(HabitSerializer(serializer.instance, context={'request': request}).data, status=status.HTTP_201_CREATED)


class HabitDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Habit.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return HabitCreateSerializer
        return HabitSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(HabitSerializer(instance).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def checkin(request, pk):
    """Mark habit as completed for today (or simulated date in test mode)."""
    habit = get_object_or_404(Habit, pk=pk, user=request.user)
    today = get_today(request)

    log, created = HabitLog.objects.get_or_create(
        habit=habit, date=today, defaults={'completed': True}
    )
    if not created and not log.completed:
        # Was previously unchecked — re-check it
        log.completed = True
        log.save()

    print(f"[checkin] habit={habit.name}  date={today}  created={created}  completed={log.completed}")

    apply_grace_streak(habit, completing=True, today=today)
    return Response(HabitSerializer(habit, context={'request': request}).data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def undo_checkin(request, pk):
    """Undo check-in for today (or simulated date in test mode)."""
    habit = get_object_or_404(Habit, pk=pk, user=request.user)
    today = get_today(request)
    try:
        log = HabitLog.objects.get(habit=habit, date=today)
        log.completed = False
        log.save()
    except HabitLog.DoesNotExist:
        pass
    apply_grace_streak(habit, completing=False, today=today)
    return Response(HabitSerializer(habit, context={'request': request}).data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def habit_logs(request, pk):
    """Return all completed logs for a habit — used by calendar."""
    habit = get_object_or_404(Habit, pk=pk, user=request.user)
    logs = habit.logs.filter(completed=True).order_by('date')
    return Response(HabitLogSerializer(logs, many=True).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def save_note(request, pk):
    """Save or update a daily note for a habit on a given date."""
    habit = get_object_or_404(Habit, pk=pk, user=request.user)
    note_date = request.data.get('date')
    note_text = request.data.get('note', '')

    if not note_date:
        return Response({'detail': 'date is required'}, status=status.HTTP_400_BAD_REQUEST)

    log, _ = HabitLog.objects.get_or_create(habit=habit, date=note_date, defaults={'completed': False})
    log.note = note_text
    log.save()
    return Response(HabitLogSerializer(log).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def day_summary(request):
    """Return summary for a specific date across all habits."""
    query_date = request.query_params.get('date', date.today().isoformat())
    habits = Habit.objects.filter(user=request.user)
    total = habits.count()
    completed_ids = set(
        HabitLog.objects.filter(
            habit__user=request.user, date=query_date, completed=True
        ).values_list('habit_id', flat=True)
    )
    completed = len(completed_ids)
    missed = total - completed
    pct = round((completed / total) * 100) if total > 0 else 0

    habit_details = []
    for h in habits:
        habit_details.append({
            'id': h.id,
            'name': h.name,
            'category': h.category,
            'completed': h.id in completed_ids,
        })

    return Response({
        'date': query_date,
        'total': total,
        'completed': completed,
        'missed': missed,
        'percentage': pct,
        'habits': habit_details,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def day_breakdown(request):
    """Per-day breakdown. ?range=7|30  or  ?start=YYYY-MM-DD&end=YYYY-MM-DD"""
    today     = date.today()
    start_str = request.query_params.get('start')
    end_str   = request.query_params.get('end')
    range_val = request.query_params.get('range', '7')

    if start_str and end_str:
        try:
            start_date = date.fromisoformat(start_str)
            end_date   = date.fromisoformat(end_str)
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)
    else:
        days       = 30 if range_val == '30' else 7
        start_date = today - timedelta(days=days - 1)
        end_date   = today

    return Response(build_daily_breakdown(request.user, start_date, end_date))


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def analytics(request):
    """Analytics data for charts and per-habit breakdown."""
    habits = Habit.objects.filter(user=request.user).prefetch_related('logs')
    today  = date.today()

    # ── Per-habit overall stats ──────────────────────────────────────────────
    habit_stats     = []
    total_possible  = 0
    total_completed = 0

    # Bulk-fetch all completed logs once
    all_completed = list(
        HabitLog.objects.filter(habit__user=request.user, completed=True)
        .values('habit_id', 'date')
    )
    # Group by habit_id for fast lookup
    from collections import defaultdict
    logs_by_habit = defaultdict(list)
    for row in all_completed:
        logs_by_habit[row['habit_id']].append(row['date'])

    for habit in habits:
        completed_dates = logs_by_habit[habit.id]
        streak_data     = calculate_streak(habit)
        days_since      = (today - habit.created_at.date()).days + 1
        completed       = len(completed_dates)
        pct             = round((completed / days_since) * 100, 1) if days_since > 0 else 0

        total_possible  += days_since
        total_completed += completed

        habit_stats.append({
            'id':               habit.id,
            'name':             habit.name,
            'category':         habit.category,
            'completion_pct':   pct,
            'total_completions': completed,
            'current_streak':   streak_data['current_streak'],
            'longest_streak':   streak_data['longest_streak'],
        })

    # ── Chart data — per-day counts from bulk logs ───────────────────────────
    # Build date→count maps from the already-fetched logs
    last_7_map  = {(today - timedelta(days=i)).isoformat(): 0 for i in range(6,  -1, -1)}
    last_30_map = {(today - timedelta(days=i)).isoformat(): 0 for i in range(29, -1, -1)}

    for row in all_completed:
        d = row['date'].isoformat()
        if d in last_7_map:  last_7_map[d]  += 1
        if d in last_30_map: last_30_map[d] += 1

    total_missed = max(0, total_possible - total_completed)

    return Response({
        'habits':  habit_stats,
        'weekly':  [{'date': d, 'completed': v} for d, v in last_7_map.items()],
        'monthly': [{'date': d, 'completed': v} for d, v in last_30_map.items()],
        'pie':     {'completed': total_completed, 'missed': total_missed},
        'overall_pct': round((total_completed / total_possible) * 100, 1) if total_possible > 0 else 0,
    })

from datetime import date, timedelta
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Count, Q
from .models import Habit, HabitLog
from .forms import HabitForm
from .services import apply_grace_streak, get_today, build_daily_breakdown


@login_required
def dashboard(request):
    habits = Habit.objects.filter(user=request.user).prefetch_related('logs')
    search = request.GET.get('q', '')
    category = request.GET.get('category', '')
    if search:
        habits = habits.filter(name__icontains=search)
    if category:
        habits = habits.filter(category=category)

    today = get_today(request)
    test_mode = bool(request.headers.get('X-Test-Date') or request.GET.get('test_date'))
    simulated_date = request.GET.get('test_date', '')

    total = habits.count()
    completed_today = sum(1 for h in habits if h.logs.filter(date=today, completed=True).exists())
    best_streak = max((h.current_streak for h in habits), default=0)

    # Weekly data for chart
    week_labels = []
    week_data = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        week_labels.append(d.strftime('%a'))
        count = HabitLog.objects.filter(
            habit__user=request.user, date=d, completed=True
        ).count()
        week_data.append(count)

    context = {
        'habits': habits,
        'total': total,
        'completed_today': completed_today,
        'best_streak': best_streak,
        'week_labels': week_labels,
        'week_data': week_data,
        'search': search,
        'category': category,
        'categories': Habit.CATEGORY_CHOICES,
        'today': today,
        'test_mode': test_mode,
        'simulated_date': simulated_date or today.isoformat(),
    }
    return render(request, 'habits/dashboard.html', context)


@login_required
def add_habit(request):
    form = HabitForm(request.POST or None, user=request.user)
    if request.method == 'POST' and form.is_valid():
        habit = form.save(commit=False)
        habit.user = request.user
        habit.save()
        messages.success(request, f'Habit "{habit.name}" created!')
        return redirect('dashboard')
    return render(request, 'habits/habit_form.html', {'form': form, 'title': 'Add Habit'})


@login_required
def edit_habit(request, pk):
    habit = get_object_or_404(Habit, pk=pk, user=request.user)
    form = HabitForm(request.POST or None, instance=habit, user=request.user)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Habit updated!')
        return redirect('dashboard')
    return render(request, 'habits/habit_form.html', {'form': form, 'title': 'Edit Habit'})


@login_required
def delete_habit(request, pk):
    habit = get_object_or_404(Habit, pk=pk, user=request.user)
    if request.method == 'POST':
        habit.delete()
        messages.success(request, 'Habit deleted.')
        return redirect('dashboard')
    return render(request, 'habits/confirm_delete.html', {'habit': habit})


@login_required
def checkin(request, pk):
    if request.method == 'POST':
        habit = get_object_or_404(Habit, pk=pk, user=request.user)
        today = get_today(request)
        log, created = HabitLog.objects.get_or_create(
            habit=habit, date=today, defaults={'completed': True}
        )
        if not created:
            log.completed = not log.completed
            log.save()

        apply_grace_streak(habit, completing=log.completed, today=today)

        return JsonResponse({
            'completed':   log.completed,
            'streak':      habit.current_streak,
            'grace_used':  habit.grace_used,
            'grace_count': habit.grace_count,
        })
    return JsonResponse({'error': 'POST required'}, status=405)


@login_required
def analytics(request):
    habits = Habit.objects.filter(user=request.user)
    today  = date.today()

    range_type = request.GET.get('range', '7')
    try:
        days = int(range_type)
        if days not in (7, 30):
            days = 7
    except ValueError:
        days = 7

    start_date   = today - timedelta(days=days - 1)
    total_habits = habits.count()

    # ── Per-habit overall stats ──────────────────────────────────────────────
    from collections import defaultdict
    from .models import HabitLog as HL
    all_logs = HL.objects.filter(habit__user=request.user, completed=True).values('habit_id', 'date')
    logs_by_habit = defaultdict(list)
    for row in all_logs:
        logs_by_habit[row['habit_id']].append(row['date'])

    habit_stats = []
    for h in habits:
        completed_dates = logs_by_habit[h.id]
        days_since = (today - h.created_at.date()).days + 1
        pct = round((len(completed_dates) / days_since) * 100, 1) if days_since > 0 else 0
        habit_stats.append({
            'habit':   h,
            'total':   len(completed_dates),
            'pct':     pct,
            'streak':  h.current_streak,
            'longest': h.longest_streak(),
        })

    # ── Chart data — from bulk logs ──────────────────────────────────────────
    chart_labels, chart_done, chart_missed = [], [], []
    date_count = defaultdict(int)
    for row in all_logs:
        date_count[row['date'].isoformat()] += 1

    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        chart_labels.append(d.strftime('%b %d'))
        done = date_count.get(d.isoformat(), 0)
        chart_done.append(done)
        chart_missed.append(max(0, total_habits - done))

    # ── Daily breakdown — via service ────────────────────────────────────────
    daily_breakdown, avg_pct, best_day, worst_day = build_daily_breakdown(
        request.user, start_date, today
    )

    context = {
        'habit_stats':     habit_stats,
        'chart_labels':    chart_labels,
        'chart_done':      chart_done,
        'chart_missed':    chart_missed,
        'daily_breakdown': daily_breakdown,
        'range_type':      str(days),
        'avg_pct':         avg_pct,
        'best_day':        best_day,
        'worst_day':       worst_day,
        'today':           today.isoformat(),
    }
    return render(request, 'habits/analytics.html', context)


@login_required
def day_breakdown_api(request):
    """JSON — per-habit detail for a single date."""
    query_date = request.GET.get('date', date.today().isoformat())
    try:
        d = date.fromisoformat(query_date)
    except ValueError:
        return JsonResponse({'error': 'Invalid date'}, status=400)

    # Reuse the service for a single-day range
    result, _, _, _ = build_daily_breakdown(request.user, d, d)
    day = result[0] if result else {'habits': []}
    return JsonResponse({'date': query_date, 'habits': day['habits']})

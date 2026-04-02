from datetime import date, timedelta


def get_today(request=None):
    """Return today's date, or the simulated date from X-Test-Date header."""
    if request is not None:
        test_date = request.headers.get('X-Test-Date') or request.META.get('HTTP_X_TEST_DATE')
        if test_date:
            try:
                return date.fromisoformat(test_date)
            except ValueError:
                pass
    return date.today()


def build_daily_breakdown(user, start_date, end_date):
    """
    Return (result_list, avg_pct, best_day, worst_day) for the date range.
    Two bulk queries — no per-day DB hits.
    Dates normalised to Python date objects to prevent SQLite string mismatch.
    """
    from .models import Habit, HabitLog
    from datetime import date as date_type

    print(f"[breakdown] start={start_date}  end={end_date}  user={user}")

    all_habits = list(Habit.objects.filter(user=user).order_by('created_at'))
    print(f"[breakdown] total habits: {len(all_habits)}")

    raw_logs = HabitLog.objects.filter(
        habit__user=user,
        date__gte=start_date,
        date__lte=end_date,
        completed=True,
    ).values('habit_id', 'date')

    # Normalise date type — SQLite can return strings
    completed_set = set()
    for row in raw_logs:
        d = row['date']
        if isinstance(d, str):
            d = date_type.fromisoformat(d)
        completed_set.add((row['habit_id'], d))

    print(f"[breakdown] completed entries in range: {len(completed_set)}")

    result = []
    completion_pcts = []
    current = start_date

    while current <= end_date:
        active = [h for h in all_habits if h.created_at.date() <= current]
        total  = len(active)
        completed_count = sum(1 for h in active if (h.id, current) in completed_set)
        missed_count    = total - completed_count
        pct = round((completed_count / total) * 100) if total > 0 else 0
        completion_pcts.append(pct)

        print(f"[breakdown]  {current}  active={total}  done={completed_count}  missed={missed_count}")

        habit_detail = [
            {
                'id':        h.id,
                'name':      h.name,
                'category':  h.get_category_display(),
                'completed': (h.id, current) in completed_set,
            }
            for h in active
        ]

        result.append({
            'date':                  current.isoformat(),
            'label':                 current.strftime('%a, %b %d'),
            'is_today':              current == date_type.today(),
            'total_habits':          total,
            'completed_count':       completed_count,
            'missed_count':          missed_count,
            'completion_percentage': pct,
            'total':     total,
            'completed': completed_count,
            'missed':    missed_count,
            'pct':       pct,
            'habits':    habit_detail,
        })
        current += timedelta(days=1)

    days_with_habits = [r for r in result if r['total_habits'] > 0]
    avg_pct   = round(sum(completion_pcts) / len(completion_pcts), 1) if completion_pcts else 0
    best_day  = max(days_with_habits, key=lambda x: x['pct'], default=None)
    worst_day = min(days_with_habits, key=lambda x: x['pct'], default=None)

    return result, avg_pct, best_day, worst_day


GRACE_LIMIT = 3


def apply_grace_streak(habit, completing: bool, today=None):
    """Grace-day streak logic with a cap of GRACE_LIMIT uses per habit."""
    if today is None:
        today = date.today()
    last = habit.last_completed_date

    if completing:
        if last == today:
            return
        if last is None:
            habit.current_streak      = 1
            habit.grace_used          = False
            habit.last_completed_date = today
        else:
            gap = (today - last).days
            if gap == 1:
                habit.current_streak     += 1
                habit.grace_used          = False
                habit.last_completed_date = today
            elif gap == 2 and habit.grace_count < GRACE_LIMIT:
                habit.current_streak     += 1
                habit.grace_used          = True
                habit.grace_count        += 1
                habit.last_completed_date = today
            else:
                habit.current_streak      = 1
                habit.grace_used          = False
                habit.last_completed_date = today
    else:
        if last == today:
            habit.current_streak      = max(0, habit.current_streak - 1)
            habit.last_completed_date = None if habit.current_streak == 0 else today - timedelta(days=1)
            if habit.grace_used:
                habit.grace_count = max(0, habit.grace_count - 1)
            habit.grace_used = False

    habit.save(update_fields=['current_streak', 'last_completed_date', 'grace_used', 'grace_count'])

from datetime import date, timedelta
from .models import HabitLog


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
    Return per-day dicts between start_date and end_date (inclusive).
    Two bulk queries total — no per-day DB hits.
    Dates are normalised to Python date objects to prevent type-mismatch
    lookups (SQLite can return strings via .values()).
    """
    from .models import Habit
    from datetime import date as date_type

    print(f"[breakdown] start={start_date}  end={end_date}  user={user}")

    all_habits = list(Habit.objects.filter(user=user).order_by('created_at'))
    print(f"[breakdown] total habits for user: {len(all_habits)}")

    raw_logs = HabitLog.objects.filter(
        habit__user=user,
        date__gte=start_date,
        date__lte=end_date,
        completed=True,
    ).values('habit_id', 'date')

    # Normalise: ensure every date in the set is a real date object
    completed_set = set()
    for row in raw_logs:
        d = row['date']
        if isinstance(d, str):
            d = date_type.fromisoformat(d)
        completed_set.add((row['habit_id'], d))

    print(f"[breakdown] completed log entries in range: {len(completed_set)}")

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

        print(f"[breakdown]  {current}  active={total}  done={completed_count}  missed={missed_count}  pct={pct}%")

        habit_detail = [
            {
                'id':        h.id,
                'name':      h.name,
                'category':  h.category,
                'completed': (h.id, current) in completed_set,
            }
            for h in active
        ]

        result.append({
            'date':                  current.isoformat(),
            'total_habits':          total,
            'completed_count':       completed_count,
            'missed_count':          missed_count,
            'completion_percentage': pct,
            'habits':                habit_detail,
        })
        current += timedelta(days=1)

    days_with_habits = [r for r in result if r['total_habits'] > 0]
    avg_pct   = round(sum(completion_pcts) / len(completion_pcts), 1) if completion_pcts else 0
    best_day  = max(days_with_habits, key=lambda x: x['completion_percentage'], default=None)
    worst_day = min(days_with_habits, key=lambda x: x['completion_percentage'], default=None)

    return {
        'days': result,
        'summary': {
            'avg_completion': avg_pct,
            'best_day':  best_day['date']  if best_day  else None,
            'worst_day': worst_day['date'] if worst_day else None,
            'best_pct':  best_day['completion_percentage']  if best_day  else 0,
            'worst_pct': worst_day['completion_percentage'] if worst_day else 0,
        },
    }


GRACE_LIMIT = 3  # maximum lifetime grace days per habit


def apply_grace_streak(habit, completing: bool, today=None):
    """
    Update streak fields on the habit.

    Grace rules:
      gap == 1  → consecutive day, streak++, clear grace_used
      gap == 2  → one missed day:
                    if grace_count < GRACE_LIMIT → streak++, grace_used=True, grace_count++
                    else                         → reset streak, grace_used=False
      gap > 2   → reset streak, grace_used=False
      undo      → decrement streak, clear grace_used

    grace_count is never reset — it tracks lifetime usage per habit.
    """
    if today is None:
        today = date.today()
    last = habit.last_completed_date

    if completing:
        if last == today:
            return  # idempotent

        if last is None:
            habit.current_streak      = 1
            habit.grace_used          = False
            habit.last_completed_date = today

        else:
            gap = (today - last).days

            if gap == 1:
                # Perfect consecutive day — clear grace flag but keep count
                habit.current_streak     += 1
                habit.grace_used          = False
                habit.last_completed_date = today

            elif gap == 2 and habit.grace_count < GRACE_LIMIT:
                # One missed day and grace still available
                habit.current_streak     += 1
                habit.grace_used          = True
                habit.grace_count        += 1
                habit.last_completed_date = today

            else:
                # Gap too large OR grace limit reached
                habit.current_streak      = 1
                habit.grace_used          = False
                habit.last_completed_date = today

    else:
        # Undo today's check-in
        if last == today:
            habit.current_streak      = max(0, habit.current_streak - 1)
            habit.last_completed_date = None if habit.current_streak == 0 else today - timedelta(days=1)
            # Roll back grace_count if this check-in had used grace
            if habit.grace_used:
                habit.grace_count = max(0, habit.grace_count - 1)
            habit.grace_used = False

    habit.save(update_fields=['current_streak', 'last_completed_date', 'grace_used', 'grace_count'])


def calculate_streak(habit):
    """Returns streak data from stored fields + log-derived longest streak."""
    total = HabitLog.objects.filter(habit=habit, completed=True).count()
    dates = sorted(HabitLog.objects.filter(habit=habit, completed=True).values_list('date', flat=True))
    longest = 0
    if dates:
        streak = longest = 1
        for i in range(1, len(dates)):
            if dates[i] - dates[i - 1] == timedelta(days=1):
                streak += 1
                longest = max(longest, streak)
            else:
                streak = 1
    return {
        'current_streak':    habit.current_streak,
        'longest_streak':    longest,
        'total_completions': total,
        'grace_used':        habit.grace_used,
        'grace_count':       habit.grace_count,
        'grace_remaining':   max(0, GRACE_LIMIT - habit.grace_count),
    }

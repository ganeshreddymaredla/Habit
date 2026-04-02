/**
 * Notification service — handles both in-app banner notifications
 * and optional browser Notification API.
 * Reminders stored in localStorage: { [habitId]: "HH:MM" }
 */

const STORAGE_KEY = 'habit_reminders'

export function getReminders() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

export function setReminder(habitId, time) {
  const r = getReminders()
  if (time) r[String(habitId)] = time
  else delete r[String(habitId)]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r))
}

export function removeReminder(habitId) {
  setReminder(habitId, null)
}

export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/**
 * Start the reminder scheduler.
 * Checks every 30s if any habit reminder matches current HH:MM
 * and the habit hasn't been completed today.
 *
 * @param {Function} getHabits  - returns current habits array
 * @param {Function} onNotify   - callback({ id, habitName, message }) for in-app banner
 */
export function startReminderScheduler(getHabits, onNotify) {
  // Track which habit+date combos we've already notified to avoid repeats
  const notified = new Set()

  const check = () => {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const todayKey = now.toISOString().split('T')[0]
    const reminders = getReminders()
    const habits = getHabits()

    for (const [habitId, reminderTime] of Object.entries(reminders)) {
      if (reminderTime !== currentTime) continue
      const dedupeKey = `${habitId}-${todayKey}-${reminderTime}`
      if (notified.has(dedupeKey)) continue

      const habit = habits.find(h => String(h.id) === String(habitId))
      if (!habit || habit.completed_today) continue

      notified.add(dedupeKey)

      const payload = {
        id: dedupeKey,
        habitName: habit.name,
        message: `Don't forget to complete this habit today! Keep your streak alive 🔥`,
      }

      // In-app banner
      if (onNotify) onNotify(payload)

      // Also fire browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(`⏰ Reminder: ${habit.name}`, {
          body: payload.message,
          icon: '/favicon.ico',
        })
      }
    }
  }

  check()
  const id = setInterval(check, 30_000)
  return () => clearInterval(id)
}

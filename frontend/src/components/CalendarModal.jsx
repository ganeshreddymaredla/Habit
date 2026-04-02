import { useEffect, useState, useCallback } from 'react'
import { X, Flame, Trophy, CheckCircle2, StickyNote, Info } from 'lucide-react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import api from '../services/api'
import { getReminders } from '../services/notifications'

/** Convert a JS Date to local "YYYY-MM-DD" without UTC shift */
const toISO = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayISO = toISO(new Date())

export default function CalendarModal({ habit, onClose, onHabitUpdate }) {
  const [logs, setLogs] = useState([])          // { date, completed, note }
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(habit.stats)
  const [selectedDate, setSelectedDate] = useState(null)  // ISO string
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [dayPopup, setDayPopup] = useState(null)  // day summary data
  const [toggling, setToggling] = useState(false)

  const reminderTime = getReminders()[String(habit.id)]

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await api.get(`/habits/${habit.id}/logs/`)
      setLogs(data)
    } catch (err) {
      console.error('Failed to fetch logs', err)
    } finally {
      setLoading(false)
    }
  }, [habit.id])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Build lookup maps from logs
  const completedSet = new Set(logs.filter(l => l.completed).map(l => l.date))
  const noteMap = Object.fromEntries(logs.map(l => [l.date, l.note || '']))

  // Habit creation date — slice the date part directly to avoid UTC timezone shift
  const createdISO = habit.created_at.slice(0, 10)

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null
    const key = toISO(date)
    const classes = []

    if (completedSet.has(key)) {
      classes.push('cal-done')
    } else if (key < todayISO && key >= createdISO) {
      classes.push('cal-missed')
    }

    if (key === todayISO) classes.push('cal-today')
    if (key === selectedDate) classes.push('cal-selected')
    if (reminderTime && key === todayISO) classes.push('cal-reminder')

    return classes.join(' ') || null
  }

  const tileDisabled = ({ date }) => toISO(date) > todayISO

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null
    const key = toISO(date)
    if (noteMap[key]) {
      return <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400" />
    }
    return null
  }

  const handleDayClick = async (date) => {
    const key = toISO(date)
    if (key > todayISO) return
    setSelectedDate(key)
    setNoteText(noteMap[key] || '')

    // Fetch day summary popup
    try {
      const { data } = await api.get(`/day-summary/?date=${key}`)
      setDayPopup(data)
    } catch { setDayPopup(null) }
  }

  const handleToggle = async () => {
    if (!selectedDate || toggling) return
    setToggling(true)
    try {
      let res
      if (completedSet.has(selectedDate)) {
        // Undo — only allow for today
        if (selectedDate !== todayISO) {
          return
        }
        res = await api.post(`/habits/${habit.id}/undo/`)
      } else {
        // Only allow check-in for today
        if (selectedDate !== todayISO) return
        res = await api.post(`/habits/${habit.id}/checkin/`)
      }
      // Refresh logs and stats
      await fetchLogs()
      setStats(res.data.stats)
      if (onHabitUpdate) onHabitUpdate(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(false)
    }
  }

  const handleSaveNote = async () => {
    if (!selectedDate) return
    setSavingNote(true)
    try {
      await api.post(`/habits/${habit.id}/note/`, { date: selectedDate, note: noteText })
      setLogs(prev => {
        const existing = prev.find(l => l.date === selectedDate)
        if (existing) return prev.map(l => l.date === selectedDate ? { ...l, note: noteText } : l)
        return [...prev, { date: selectedDate, completed: false, note: noteText }]
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-5 fade-in overflow-y-auto"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>{habit.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {reminderTime ? `⏰ Reminder at ${reminderTime}` : 'Completion history'}
            </p>
          </div>
          <button onClick={onClose} className="hover:opacity-70 transition p-1"
            style={{ color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-2 mb-4">
          <StatPill icon={<Flame size={13} className="text-orange-500 streak-fire" />}
            label="Streak" value={`${stats.current_streak}d`} />
          <StatPill icon={<Trophy size={13} className="text-yellow-500" />}
            label="Best" value={`${stats.longest_streak}d`} />
          <StatPill icon={<CheckCircle2 size={13} className="text-green-500" />}
            label="Total" value={stats.total_completions} />
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="cal-wrapper">
            <Calendar
              tileClassName={tileClassName}
              tileDisabled={tileDisabled}
              tileContent={tileContent}
              onClickDay={handleDayClick}
              showNeighboringMonth={false}
              locale="en-US"
            />
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-3 justify-center text-xs"
          style={{ color: 'var(--muted)' }}>
          <LegendDot color="#22c55e" label="Completed" />
          <LegendDot color="#fecaca" label="Missed" border />
          <LegendDot color="var(--border)" label="Future" />
          <LegendDot color="transparent" label="Today" outline />
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Has note
          </span>
        </div>

        {/* Selected day panel */}
        {selectedDate && (
          <div className="mt-4 rounded-xl p-4 fade-in"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric'
                })}
              </p>
              {/* Toggle button — only for today */}
              {selectedDate === todayISO && (
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition active:scale-95
                    ${completedSet.has(selectedDate) ? 'bg-red-100 text-red-600' : 'text-white'}`}
                  style={!completedSet.has(selectedDate) ? { background: 'var(--primary)' } : {}}>
                  {toggling ? '…' : completedSet.has(selectedDate) ? '✗ Mark Undone' : '✓ Mark Done'}
                </button>
              )}
            </div>

            {/* Day summary */}
            {dayPopup && (
              <div className="flex gap-3 mb-3 text-xs">
                <span style={{ color: 'var(--muted)' }}>
                  Total: <strong style={{ color: 'var(--text)' }}>{dayPopup.total}</strong>
                </span>
                <span className="text-green-600">
                  Done: <strong>{dayPopup.completed}</strong>
                </span>
                <span className="text-red-500">
                  Missed: <strong>{dayPopup.missed}</strong>
                </span>
                <span style={{ color: 'var(--primary)' }}>
                  <strong>{dayPopup.percentage}%</strong>
                </span>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="flex items-center gap-1 text-xs font-medium mb-1"
                style={{ color: 'var(--muted)' }}>
                <StickyNote size={12} /> Daily note
              </label>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note for this day…"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="mt-2 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition hover:opacity-90"
                style={{ background: 'var(--primary)' }}>
                {savingNote ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatPill({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-1 justify-center"
      style={{ background: 'var(--bg)' }}>
      {icon}
      <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}:</span>
      <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

function LegendDot({ color, label, border, outline }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 rounded-sm inline-block"
        style={{
          background: color,
          border: border ? '1px solid #fca5a5' : outline ? `2px solid var(--primary)` : 'none'
        }} />
      {label}
    </span>
  )
}

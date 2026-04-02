import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Flame, CheckCircle2, Trophy, Search, BarChart2, FlaskConical, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useTestMode } from '../context/TestModeContext'
import HabitCard from '../components/HabitCard'
import HabitModal from '../components/HabitModal'
import CalendarModal from '../components/CalendarModal'
import NotificationBanner from '../components/NotificationBanner'
import toast from 'react-hot-toast'
import { startReminderScheduler, requestPermission } from '../services/notifications'

export default function Dashboard() {
  const { user } = useAuth()
  const { isTestMode, simulatedDate, reset: resetTestMode } = useTestMode()
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [bannerNotifs, setBannerNotifs] = useState([])
  const habitsRef = useRef(habits)

  useEffect(() => { habitsRef.current = habits }, [habits])

  useEffect(() => {
    requestPermission()
    const stop = startReminderScheduler(
      () => habitsRef.current,
      (notif) => setBannerNotifs(prev => [...prev, notif])
    )
    return stop
  }, [])

  const fetchHabits = useCallback(async () => {
    try {
      const { data } = await api.get('/habits/')
      setHabits(data)
    } catch { toast.error('Failed to load habits') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchHabits() }, [fetchHabits])

  // Re-fetch when simulated date changes so completed_today reflects the new date
  useEffect(() => {
    if (isTestMode) fetchHabits()
  }, [simulatedDate, isTestMode]) // eslint-disable-line

  const totalStreak = habits.reduce((s, h) => s + h.stats.current_streak, 0)
  const totalDone   = habits.reduce((s, h) => s + h.stats.total_completions, 0)
  const doneToday   = habits.filter(h => h.completed_today).length
  const bestStreak  = habits.reduce((s, h) => Math.max(s, h.stats.longest_streak), 0)
  const progressPct = habits.length > 0 ? Math.round((doneToday / habits.length) * 100) : 0

  const syncHabit = (updated) =>
    setHabits(prev => prev.map(h => h.id === updated.id ? updated : h))

  const handleCreate = (created) => { setHabits(prev => [created, ...prev]); setModal(null) }
  const handleUpdate = (updated, isEdit) => { syncHabit(updated); if (isEdit) setModal(null) }

  const handleDelete = async (id) => {
    if (!confirm('Delete this habit? This cannot be undone.')) return
    try {
      await api.delete(`/habits/${id}/`)
      setHabits(prev => prev.filter(h => h.id !== id))
      toast.success('Habit deleted')
    } catch { toast.error('Delete failed') }
  }

  const cardUpdate = (habit, action) => {
    if (action === 'edit') setModal({ type: 'habit', habit })
    else syncHabit(habit)
  }

  const filtered = habits
    .filter(h => h.name.toLowerCase().includes(search.toLowerCase()))
    .filter(h => filter === 'done' ? h.completed_today : filter === 'pending' ? !h.completed_today : true)

  return (
    <>
      <NotificationBanner
        notifications={bannerNotifs}
        onDismiss={(id) => setBannerNotifs(prev => prev.filter(n => n.id !== id))}
      />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Test Mode Banner */}
        {isTestMode && (
          <div className="flex items-center justify-between gap-3 mb-5 px-4 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1.5px solid #f59e0b', color: '#d97706' }}>
            <div className="flex items-center gap-2">
              <FlaskConical size={16} />
              Test Mode Active — Simulating date: <strong>{simulatedDate}</strong>
            </div>
            <button onClick={() => { localStorage.removeItem('test_date'); resetTestMode() }}
              className="hover:opacity-70 transition" title="Exit test mode">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text)' }}>
            Hey, {user?.username} 👋
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {doneToday}/{habits.length} habits done today
          </p>
        </div>

        {/* Daily progress bar */}
        {habits.length > 0 && (
          <div className="mb-5 rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'var(--text)' }}>Today's Progress</span>
              <span className="font-bold" style={{ color: progressPct === 100 ? 'var(--success)' : 'var(--primary)' }}>
                {progressPct}%
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full progress-bar transition-all"
                style={{
                  width: `${progressPct}%`,
                  background: progressPct === 100
                    ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                    : 'linear-gradient(90deg,var(--primary),#818cf8)',
                }}
              />
            </div>
            {progressPct === 100 && (
              <p className="text-xs mt-1.5 text-green-600 font-medium">All habits done! 🎉</p>
            )}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <SummaryCard icon={<Flame className="text-orange-500 streak-fire" size={20} />} label="Active Streaks" value={totalStreak} />
          <SummaryCard icon={<Trophy className="text-yellow-500" size={20} />} label="Best Streak" value={`${bestStreak}d`} />
          <SummaryCard icon={<CheckCircle2 className="text-green-500" size={20} />} label="Done Today" value={`${doneToday}/${habits.length}`} />
          <SummaryCard icon={<CheckCircle2 className="text-indigo-500" size={20} />} label="All Time" value={totalDone} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search habits…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm outline-none"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'done'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition capitalize ${filter === f ? 'text-white' : 'hover:opacity-70'}`}
                style={filter === f ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                {f}
              </button>
            ))}
          </div>
          <Link to="/analytics"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-90"
            style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <BarChart2 size={16} /> Analytics
          </Link>
          <button onClick={() => setModal({ type: 'habit' })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition hover:opacity-90 active:scale-95"
            style={{ background: 'var(--primary)' }}>
            <Plus size={16} /> Add Habit
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: 'var(--card)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasHabits={habits.length > 0} onAdd={() => setModal({ type: 'habit' })} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(habit => (
              <HabitCard key={habit.id} habit={habit}
                onUpdate={cardUpdate} onDelete={handleDelete}
                onViewLogs={(h) => setModal({ type: 'calendar', habit: h })} />
            ))}
          </div>
        )}

        {modal?.type === 'habit' && (
          <HabitModal habit={modal.habit} onClose={() => setModal(null)}
            onSave={(data, isEdit) => isEdit ? handleUpdate(data, true) : handleCreate(data)} />
        )}
        {modal?.type === 'calendar' && (
          <CalendarModal habit={modal.habit} onClose={() => setModal(null)} onHabitUpdate={syncHabit} />
        )}
      </div>
    </>
  )
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl p-4 border fade-in" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-1">{icon}
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  )
}

function EmptyState({ hasHabits, onAdd }) {
  return (
    <div className="text-center py-16 fade-in">
      <Flame size={48} className="mx-auto mb-4 text-gray-300" />
      <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text)' }}>
        {hasHabits ? 'No habits match your filter' : 'No habits yet'}
      </p>
      <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
        {hasHabits ? 'Try a different filter' : 'Start building your first habit streak'}
      </p>
      {!hasHabits && (
        <button onClick={onAdd}
          className="px-5 py-2.5 rounded-xl text-white font-medium transition hover:opacity-90"
          style={{ background: 'var(--primary)' }}>
          Add your first habit
        </button>
      )}
    </div>
  )
}

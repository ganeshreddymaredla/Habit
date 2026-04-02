import { useState } from 'react'
import { Flame, CheckCircle2, XCircle, Pencil, Trash2, Trophy, Calendar } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const CATEGORY_COLORS = {
  health:       'bg-green-100 text-green-700',
  fitness:      'bg-blue-100 text-blue-700',
  learning:     'bg-purple-100 text-purple-700',
  mindfulness:  'bg-pink-100 text-pink-700',
  productivity: 'bg-yellow-100 text-yellow-700',
  other:        'bg-gray-100 text-gray-600',
}

export default function HabitCard({ habit, onUpdate, onDelete, onViewLogs }) {
  const [loading, setLoading] = useState(false)
  const { stats, completed_today, last_completed } = habit

  const handleCheckin = async () => {
    if (loading) return
    setLoading(true)
    try {
      if (completed_today) {
        // Undo today's check-in
        const { data } = await api.post(`/habits/${habit.id}/undo/`)
        onUpdate(data)
        toast('Habit unmarked', { icon: '↩️' })
      } else {
        const { data } = await api.post(`/habits/${habit.id}/checkin/`)
        onUpdate(data)
        toast.success('Habit done! 🔥')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  // Streak progress bar: show % of week completed (out of 7)
  const weekPct = Math.min(100, Math.round((stats.current_streak / 7) * 100))

  return (
    <div className="habit-card fade-in rounded-2xl p-5 border"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate" style={{ color: 'var(--text)' }}>
            {habit.name}
          </h3>
          {habit.description && (
            <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--muted)' }}>
              {habit.description}
            </p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_COLORS[habit.category] || CATEGORY_COLORS.other}`}>
          {habit.category}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox
          icon={<Flame size={14} className={stats.current_streak > 0 ? 'streak-fire text-orange-500' : 'text-gray-400'} />}
          label="Streak" value={`${stats.current_streak}d`} />
        <StatBox icon={<Trophy size={14} className="text-yellow-500" />}
          label="Best" value={`${stats.longest_streak}d`} />
        <StatBox icon={<CheckCircle2 size={14} className="text-green-500" />}
          label="Total" value={stats.total_completions} />
      </div>

      {/* Grace day indicator */}
      {(habit.grace_used || habit.grace_count > 0) && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded-lg text-xs font-semibold w-fit"
          style={habit.grace_count >= 3
            ? { background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.3)' }
            : { background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}>
          {habit.grace_count >= 3 ? '🚫 No grace remaining' : `⚡ Grace used: ${habit.grace_count} / 3`}
        </div>
      )}

      {/* Weekly streak progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
          <span>Weekly streak</span>
          <span>{Math.min(stats.current_streak, 7)}/7 days</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full progress-bar"
            style={{
              width: `${weekPct}%`,
              background: weekPct === 100 ? '#22c55e' : 'var(--primary)',
            }}
          />
        </div>
      </div>

      {last_completed && (
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
          Last: {new Date(last_completed + 'T12:00:00').toLocaleDateString()}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCheckin}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition active:scale-95
            ${completed_today
              ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600'
              : 'text-white hover:opacity-90'}`}
          style={!completed_today ? { background: 'var(--primary)' } : {}}
          title={completed_today ? 'Click to undo' : 'Mark as done'}>
          {loading ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : completed_today ? (
            <><CheckCircle2 size={15} /> Done ↩</>
          ) : (
            <><CheckCircle2 size={15} /> Mark Done</>
          )}
        </button>

        <button onClick={() => onViewLogs(habit)}
          className="p-2 rounded-xl hover:opacity-70 transition"
          style={{ color: 'var(--muted)', background: 'var(--bg)' }}
          title="View calendar">
          <Calendar size={16} />
        </button>
        <button onClick={() => onUpdate(habit, 'edit')}
          className="p-2 rounded-xl hover:opacity-70 transition"
          style={{ color: 'var(--muted)', background: 'var(--bg)' }}
          title="Edit">
          <Pencil size={16} />
        </button>
        <button onClick={() => onDelete(habit.id)}
          className="p-2 rounded-xl hover:opacity-70 transition"
          style={{ color: 'var(--danger)', background: 'var(--bg)' }}
          title="Delete">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

function StatBox({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center p-2 rounded-xl" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
      </div>
      <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

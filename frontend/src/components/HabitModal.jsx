import { useState, useEffect } from 'react'
import { X, Bell, BellOff } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { getReminders, setReminder, requestPermission } from '../services/notifications'

const CATEGORIES = ['health', 'fitness', 'learning', 'mindfulness', 'productivity', 'other']

export default function HabitModal({ habit, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', description: '', category: 'other' })
  const [reminderTime, setReminderTime] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (habit) {
      setForm({ name: habit.name, description: habit.description, category: habit.category })
      // Load existing reminder for this habit
      const reminders = getReminders()
      setReminderTime(reminders[habit.id] || '')
    }
  }, [habit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Habit name is required')
    setSaving(true)
    try {
      let data
      if (habit?.id) {
        const res = await api.patch(`/habits/${habit.id}/`, form)
        data = res.data
        toast.success('Habit updated')
      } else {
        const res = await api.post('/habits/', form)
        data = res.data
        toast.success('Habit created 🎯')
      }

      // Save reminder (non-blocking — don't await permission before closing modal)
      onSave(data, !!habit?.id)

      if (reminderTime) {
        requestPermission().then(granted => {
          if (granted) {
            setReminder(data.id, reminderTime)
            toast.success(`Reminder set for ${reminderTime} 🔔`)
          } else {
            toast.error('Notification permission denied')
          }
        })
      } else {
        if (habit?.id) setReminder(habit.id, null)
      }
    } catch (err) {
      const errors = err.response?.data
      if (errors) {
        toast.error(Object.values(errors).flat().join(' '))
      } else {
        toast.error('Something went wrong')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 fade-in"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
            {habit?.id ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button onClick={onClose} className="hover:opacity-70 transition"
            style={{ color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              Name *
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Morning run"
              maxLength={200}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional details…"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 resize-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              Category
            </label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              <span className="flex items-center gap-1.5">
                {reminderTime ? <Bell size={14} className="text-indigo-400" /> : <BellOff size={14} style={{ color: 'var(--muted)' }} />}
                Daily Reminder
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              {reminderTime && (
                <button type="button" onClick={() => setReminderTime('')}
                  className="text-xs px-3 py-2 rounded-xl hover:opacity-70"
                  style={{ color: 'var(--danger)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              You'll get a browser notification if the habit isn't done by this time.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl border text-sm font-medium transition hover:opacity-70"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90 active:scale-95"
              style={{ background: 'var(--primary)' }}>
              {saving ? 'Saving…' : habit?.id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

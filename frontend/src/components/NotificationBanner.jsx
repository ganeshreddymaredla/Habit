import { useState, useEffect, useCallback } from 'react'
import { Bell, X, Flame } from 'lucide-react'

/**
 * Top slide-down notification banner.
 * Usage: <NotificationBanner notifications={[]} onDismiss={fn} />
 * Each notification: { id, habitName, message }
 */
export default function NotificationBanner({ notifications, onDismiss }) {
  const [exiting, setExiting] = useState(new Set())

  const dismiss = useCallback((id) => {
    setExiting(prev => new Set([...prev, id]))
    setTimeout(() => {
      onDismiss(id)
      setExiting(prev => { const s = new Set(prev); s.delete(id); return s })
    }, 300)
  }, [onDismiss])

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (notifications.length === 0) return
    const latest = notifications[notifications.length - 1]
    const t = setTimeout(() => dismiss(latest.id), 6000)
    return () => clearTimeout(t)
  }, [notifications, dismiss])

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 pt-2 px-4 pointer-events-none">
      {notifications.map(n => (
        <div
          key={n.id}
          className={`pointer-events-auto w-full max-w-md rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3
            ${exiting.has(n.id) ? 'notif-exit' : 'notif-enter'}`}
          style={{ background: 'var(--primary)', color: '#fff' }}
        >
          <div className="shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bell size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate flex items-center gap-1">
              <Flame size={13} className="streak-fire" /> {n.habitName}
            </p>
            <p className="text-xs opacity-90 truncate">{n.message}</p>
          </div>
          <button onClick={() => dismiss(n.id)}
            className="shrink-0 hover:opacity-70 transition p-1 rounded-lg">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

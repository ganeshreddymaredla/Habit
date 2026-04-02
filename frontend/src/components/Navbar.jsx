import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useTestMode } from '../context/TestModeContext'
import { Sun, Moon, LogOut, Flame, BarChart2, LayoutDashboard, FlaskConical } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { isTestMode, simulatedDate, setSimulatedDate, toggle: toggleTest, reset } = useTestMode()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const handleDateChange = (e) => {
    const val = e.target.value
    setSimulatedDate(val)
    // Keep localStorage in sync so api.js interceptor picks it up
    if (val) localStorage.setItem('test_date', val)
  }

  const handleToggleTest = () => {
    if (isTestMode) {
      localStorage.removeItem('test_date')
      reset()
    } else {
      localStorage.setItem('test_date', simulatedDate)
      toggleTest()
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b"
      style={{ background: isTestMode ? 'rgba(245,158,11,0.08)' : 'var(--card)', borderColor: isTestMode ? '#f59e0b' : 'var(--border)' }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0"
          style={{ color: 'var(--primary)' }}>
          <Flame size={22} className="streak-fire" />
          <span className="hidden sm:inline">HabitStreak</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link to="/"
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${isActive('/') ? 'font-semibold' : 'hover:opacity-70'}`}
            style={{ color: isActive('/') ? 'var(--primary)' : 'var(--muted)' }}>
            <LayoutDashboard size={14} /> <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link to="/analytics"
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${isActive('/analytics') ? 'font-semibold' : 'hover:opacity-70'}`}
            style={{ color: isActive('/analytics') ? 'var(--primary)' : 'var(--muted)' }}>
            <BarChart2 size={14} /> <span className="hidden sm:inline">Analytics</span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Test mode toggle */}
          <button
            onClick={handleToggleTest}
            title={isTestMode ? 'Disable Test Mode' : 'Enable Test Mode'}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
            style={isTestMode
              ? { background: 'rgba(245,158,11,0.2)', color: '#d97706', border: '1px solid #f59e0b' }
              : { background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            <FlaskConical size={13} />
            <span className="hidden sm:inline">{isTestMode ? 'Test ON' : 'Test'}</span>
          </button>

          {/* Date picker — only when test mode is on */}
          {isTestMode && (
            <input
              type="date"
              value={simulatedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={handleDateChange}
              className="text-xs rounded-lg px-2 py-1.5 outline-none"
              style={{ border: '1px solid #f59e0b', background: 'var(--bg)', color: 'var(--text)', fontWeight: 600 }}
            />
          )}

          <button onClick={toggle}
            className="p-2 rounded-lg hover:opacity-70 transition"
            style={{ color: 'var(--muted)' }}
            aria-label="Toggle dark mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && (
            <>
              <span className="text-sm hidden sm:block" style={{ color: 'var(--muted)' }}>
                {user.username}
              </span>
              <button onClick={logout}
                className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition"
                style={{ color: 'var(--danger)' }}>
                <LogOut size={15} /> <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>

      </div>
    </nav>
  )
}

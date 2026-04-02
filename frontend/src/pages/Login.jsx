import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Flame, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) return toast.error('Fill in all fields')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch {
      toast.error('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors"
      style={{ background: 'var(--bg)' }}>

      {/* Dark mode toggle — top right */}
      <button onClick={toggle}
        className="fixed top-4 right-4 p-2 rounded-xl border transition hover:opacity-70"
        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}
        aria-label="Toggle dark mode">
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Flame size={40} className="streak-fire text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>HabitStreak</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Build habits that stick</p>
        </div>

        <div className="rounded-2xl p-6 border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-lg mb-5" style={{ color: 'var(--text)' }}>Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Username" type="text" value={form.username}
              onChange={v => setForm(f => ({ ...f, username: v }))} />
            <Field label="Password" type="password" value={form.password}
              onChange={v => setForm(f => ({ ...f, password: v }))} />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-white font-medium transition hover:opacity-90 active:scale-95"
              style={{ background: 'var(--primary)' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm mt-4" style={{ color: 'var(--muted)' }}>
            No account?{' '}
            <Link to="/register" className="font-medium hover:underline"
              style={{ color: 'var(--primary)' }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
    </div>
  )
}

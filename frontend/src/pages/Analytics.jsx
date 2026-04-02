import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Flame, Trophy, CheckCircle2, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import api from '../services/api'

const COLORS = ['#22c55e', '#ef4444']
const BAR_COLOR = '#6366f1'

function pctColor(pct) {
  if (pct >= 70) return '#22c55e'
  if (pct >= 40) return '#f59e0b'
  return '#ef4444'
}

export default function Analytics() {
  const [data, setData]           = useState(null)
  const [breakdown, setBreakdown] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [bdLoading, setBdLoading] = useState(false)
  const [period, setPeriod]       = useState('weekly')
  const [range, setRange]         = useState('7')
  const [openDay, setOpenDay]     = useState(null)

  // Fetch main analytics
  useEffect(() => {
    api.get('/analytics/')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Fetch breakdown whenever range changes
  useEffect(() => {
    setBdLoading(true)
    setOpenDay(null)
    api.get(`/analytics/breakdown/?range=${range}`)
      .then(({ data }) => setBreakdown(data))
      .catch(() => setBreakdown(null))
      .finally(() => setBdLoading(false))
  }, [range])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="max-w-4xl mx-auto px-4 py-10 text-center" style={{ color: 'var(--muted)' }}>
      Failed to load analytics.
    </div>
  )

  const chartData = period === 'weekly' ? data.weekly : data.monthly
  const formatLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return period === 'weekly'
      ? d.toLocaleDateString('en-US', { weekday: 'short' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const pieData = [
    { name: 'Completed', value: data.pie.completed },
    { name: 'Missed',    value: data.pie.missed },
  ]
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition"
        style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Analytics</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Your habit performance at a glance</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <SummaryCard icon={<TrendingUp size={18} className="text-indigo-400" />}
          label="Overall Rate" value={`${data.overall_pct}%`} />
        <SummaryCard icon={<CheckCircle2 size={18} className="text-green-500" />}
          label="Total Done" value={data.pie.completed} />
        <SummaryCard icon={<Flame size={18} className="text-orange-500" />}
          label="Best Streak" value={`${Math.max(0, ...data.habits.map(h => h.longest_streak))}d`} />
        <SummaryCard icon={<Trophy size={18} className="text-yellow-500" />}
          label="Habits Tracked" value={data.habits.length} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="lg:col-span-2 rounded-2xl p-5 border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Completions Over Time</h2>
            <div className="flex gap-2">
              {['weekly', 'monthly'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition capitalize ${period === p ? 'text-white' : 'hover:opacity-70'}`}
                  style={period === p
                    ? { background: 'var(--primary)' }
                    : { background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tickFormatter={formatLabel} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}
                labelStyle={{ color: 'var(--text)', fontSize: 12 }}
                itemStyle={{ color: BAR_COLOR }}
                labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              />
              <Bar dataKey="completed" fill={BAR_COLOR} radius={[4, 4, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Completed vs Missed</h2>
          {data.pie.completed + data.pie.missed === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--muted)' }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }} itemStyle={{ fontSize: 12 }} />
                <Legend iconType="circle" iconSize={10}
                  formatter={(v) => <span style={{ color: 'var(--text)', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Daily Breakdown ── */}
      <div className="rounded-2xl border mb-8" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {/* Header + range selector */}
        <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3"
          style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
              <Calendar size={15} className="inline mr-1 mb-0.5" /> Daily Breakdown
            </h2>
            {breakdown?.summary && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                Avg {breakdown.summary.avg_completion}% &nbsp;·&nbsp;
                Best: <span style={{ color: '#22c55e', fontWeight: 600 }}>{breakdown.summary.best_day} ({breakdown.summary.best_pct}%)</span>
                &nbsp;·&nbsp;
                Worst: <span style={{ color: '#ef4444', fontWeight: 600 }}>{breakdown.summary.worst_day} ({breakdown.summary.worst_pct}%)</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {[['7', 'Last 7 days'], ['30', 'Last 30 days']].map(([val, label]) => (
              <button key={val} onClick={() => setRange(val)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
                style={range === val
                  ? { background: 'var(--primary)', color: '#fff' }
                  : { background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Breakdown rows */}
        {bdLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : breakdown?.days?.length ? (
          <div>
            {breakdown.days.map((day) => {
              const isToday = day.date === today
              const isOpen  = openDay === day.date
              const color   = pctColor(day.completion_percentage)
              return (
                <div key={day.date}>
                  <div
                    className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:opacity-80 transition flex-wrap"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: isToday ? 'rgba(99,102,241,0.05)' : 'transparent',
                      borderLeft: isToday ? '3px solid var(--primary)' : '3px solid transparent',
                    }}
                    onClick={() => setOpenDay(isOpen ? null : day.date)}
                  >
                    {/* Date */}
                    <div style={{ minWidth: 130 }}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        {isToday && (
                          <span className="text-xs px-2 py-0.5 rounded-full text-white font-bold"
                            style={{ background: 'var(--primary)', fontSize: '0.65rem' }}>Today</span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div className="flex justify-between mb-1" style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                        <span>{day.completed_count}/{day.total_habits} done</span>
                        <span style={{ color, fontWeight: 700 }}>{day.completion_percentage}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${day.completion_percentage}%`, background: color }} />
                      </div>
                    </div>

                    {/* Counts + chevron */}
                    <div className="flex items-center gap-3 text-xs" style={{ minWidth: 100 }}>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ {day.completed_count}</span>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>✗ {day.missed_count}</span>
                      {isOpen ? <ChevronUp size={14} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted)' }} />}
                    </div>
                  </div>

                  {/* Expanded habit detail */}
                  {isOpen && (
                    <div className="px-5 py-3" style={{ background: 'rgba(99,102,241,0.03)', borderBottom: '1px solid var(--border)' }}>
                      {day.habits.length === 0 ? (
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>No habits tracked on this day.</p>
                      ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                          {day.habits.map(h => (
                            <div key={h.id} className="flex items-center gap-3 py-2 text-sm">
                              <span style={{ flex: 1, fontWeight: 600, color: 'var(--text)' }}>{h.name}</span>
                              <span className="text-xs capitalize" style={{ color: 'var(--muted)', minWidth: 80 }}>{h.category}</span>
                              <span className="text-xs font-semibold" style={{ color: h.completed ? '#22c55e' : '#ef4444', minWidth: 60, textAlign: 'right' }}>
                                {h.completed ? '✓ Done' : '✗ Missed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No data for this range.</div>
        )}
      </div>

      {/* Per-habit table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Per-Habit Breakdown</h2>
        </div>
        {data.habits.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
            No habits yet. Add some from the dashboard.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {data.habits.map(h => <HabitRow key={h.id} habit={h} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function HabitRow({ habit }) {
  const pct = habit.completion_pct
  const barColor = pctColor(pct)
  return (
    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{habit.name}</p>
        <p className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{habit.category}</p>
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
          <span>Completion</span>
          <span style={{ color: barColor, fontWeight: 600 }}>{pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>
      <div className="flex gap-4 text-xs shrink-0">
        <span style={{ color: 'var(--muted)' }}>🔥 <strong style={{ color: 'var(--text)' }}>{habit.current_streak}d</strong></span>
        <span style={{ color: 'var(--muted)' }}>🏆 <strong style={{ color: 'var(--text)' }}>{habit.longest_streak}d</strong></span>
        <span style={{ color: 'var(--muted)' }}>✓ <strong style={{ color: 'var(--text)' }}>{habit.total_completions}</strong></span>
      </div>
    </div>
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

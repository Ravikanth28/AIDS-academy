'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, LogIn, LogOut, BookOpen, PlayCircle, Award, Loader2,
  Search, Filter, ChevronLeft, ChevronRight, RefreshCw, User, Zap,
} from 'lucide-react'

interface LogEntry {
  id: string
  action: string
  detail: string | null
  points: number
  createdAt: string
  user: { id: string; name: string; phone: string }
}

const ACTION_META: Record<string, { icon: typeof LogIn; color: string; label: string }> = {
  LOGIN:               { icon: LogIn,      color: 'text-green-400 bg-green-500/15',   label: 'Login' },
  LOGOUT:              { icon: LogOut,     color: 'text-zinc-400 bg-zinc-500/15',    label: 'Logout' },
  ENROLLED:            { icon: BookOpen,   color: 'text-purple-400 bg-purple-500/15', label: 'Enrolled' },
  VIDEO_WATCHED:       { icon: PlayCircle, color: 'text-cyan-400 bg-cyan-500/15',     label: 'Video' },
  TEST_PASSED:         { icon: Zap,        color: 'text-amber-400 bg-amber-500/15',   label: 'Test Passed' },
  CERTIFICATE_EARNED:  { icon: Award,      color: 'text-yellow-400 bg-yellow-500/15', label: 'Certificate' },
}

const ALL_ACTIONS = ['LOGIN', 'LOGOUT', 'ENROLLED', 'VIDEO_WATCHED', 'TEST_PASSED', 'CERTIFICATE_EARNED']

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 30

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (actionFilter) params.set('action', actionFilter)
      const res = await fetch(`/api/admin/activity?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      console.error('Activity fetch error:', err)
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = search
    ? logs.filter(l =>
        l.user.name.toLowerCase().includes(search.toLowerCase()) ||
        l.user.phone.includes(search) ||
        (l.detail ?? '').toLowerCase().includes(search.toLowerCase()))
    : logs

  const totalPages = Math.ceil(total / limit)

  const todayLogins = logs.filter(l =>
    l.action === 'LOGIN' &&
    new Date(l.createdAt).toDateString() === new Date().toDateString()
  ).length

  const onlineNow = new Set(
    logs
      .filter(l => l.action === 'LOGIN' && Date.now() - new Date(l.createdAt).getTime() < 30 * 60 * 1000)
      .map(l => l.user.id)
  ).size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Activity className="w-7 h-7 text-green-400" />
            <span className="gradient-text">Activity Log</span>
          </h1>
          <p className="text-white/40 mt-1">Real-time login & learning activity of all students</p>
        </div>
        <button onClick={fetchLogs} className="glass-card p-2.5 hover:bg-white/5 transition-colors rounded-xl" title="Refresh">
          <RefreshCw className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: total, color: 'purple', icon: Activity },
          { label: 'Active Today', value: todayLogins, color: 'green', icon: LogIn },
          { label: 'Online (30m)', value: onlineNow, color: 'cyan', icon: User },
          { label: 'Certs Issued', value: logs.filter(l => l.action === 'CERTIFICATE_EARNED').length, color: 'amber', icon: Award },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              s.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
              s.color === 'green'  ? 'bg-green-500/20  text-green-400'  :
              s.color === 'cyan'   ? 'bg-cyan-500/20   text-cyan-400'   :
              'bg-amber-500/20 text-amber-400'
            }`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display text-xl font-bold">{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            className="input-field pl-10 w-full"
            placeholder="Search by name, phone or detail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setActionFilter(''); setPage(1) }}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${!actionFilter ? 'bg-purple-500/25 text-purple-300 border border-purple-500/30' : 'glass-card text-white/50 hover:text-white'}`}
          >
            All
          </button>
          {ALL_ACTIONS.map(a => {
            const m = ACTION_META[a]
            return (
              <button key={a}
                onClick={() => { setActionFilter(a); setPage(1) }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${actionFilter === a ? 'bg-purple-500/25 text-purple-300 border border-purple-500/30' : 'glass-card text-white/50 hover:text-white'}`}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Log Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30">No activity logged yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            <AnimatePresence>
              {filtered.map((log, i) => {
                const meta = ACTION_META[log.action] ?? { icon: Activity, color: 'text-white/40 bg-white/5', label: log.action }
                const Icon = meta.icon
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <Link href={`/admin/students/${log.user.id}`} className="flex-shrink-0 group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xs font-bold group-hover:scale-110 transition-transform">
                        {log.user.name[0].toUpperCase()}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/students/${log.user.id}`} className="text-sm font-medium hover:text-purple-300 transition-colors">
                          {log.user.name}
                        </Link>
                        <span className="text-white/25 text-xs">{log.user.phone}</span>
                      </div>
                      <p className="text-xs text-white/40 truncate">{log.detail ?? meta.label}</p>
                    </div>
                    {log.points > 0 && (
                      <div className="text-xs font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full flex-shrink-0">
                        +{log.points} pts
                      </div>
                    )}
                    <div className="text-xs text-white/30 flex-shrink-0 text-right">
                      <div>{new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      <div>{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/40">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="glass-card p-2 rounded-xl disabled:opacity-30 hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="glass-card p-2 rounded-xl disabled:opacity-30 hover:bg-white/5 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

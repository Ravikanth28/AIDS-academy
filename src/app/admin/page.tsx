'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BookOpen, Users, Award, PlayCircle, ChevronRight, Sparkles,
  Activity, Trophy, Zap,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface CourseRaw {
  id: string
  title: string
  category: string
  modules: unknown[]
  _count: { enrollments: number }
}

interface StudentRaw {
  id: string
  name: string
  phone: string
  createdAt: string
  enrollments: Array<{
    course: { id: string; title: string }
    moduleProgress: Array<{ testPassed: boolean }>
  }>
  certificates: unknown[]
}

interface Stats {
  totalCourses: number
  totalStudents: number
  totalCertificates: number
  totalModules: number
  recentStudents: Array<{ id: string; name: string; phone: string; createdAt: string }>
  courseEnrollChart: Array<{ name: string; students: number }>
  categoryPie: Array<{ name: string; value: number }>
}

interface RecentActivity {
  id: string
  action: string
  detail: string | null
  points: number
  createdAt: string
  user: { id: string; name: string; phone: string }
}

interface LeaderEntry {
  rank: number
  userId: string
  name: string
  points: number
  user?: { name: string }
}

const ACTION_COLOR: Record<string, string> = {
  LOGIN: 'text-green-400',
  ENROLLED: 'text-purple-400',
  TEST_PASSED: 'text-amber-400',
  CERTIFICATE_EARNED: 'text-yellow-400',
  VIDEO_WATCHED: 'text-cyan-400',
}

const CHART_COLORS = ['#a855f7', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#6366f1']

// Custom tooltip for recharts
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-300 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.name === 'students' ? '#a855f7' : '#22d3ee' }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      // Fetch core stats (courses + students always succeed)
      const [coursesRes, studentsRes] = await Promise.all([
        fetch('/api/admin/courses'),
        fetch('/api/admin/students'),
      ])
      const courses: CourseRaw[] = await coursesRes.json()
      const students: StudentRaw[] = await studentsRes.json()

      const totalModules = courses.reduce((acc, c) => acc + c.modules.length, 0)
      const totalCerts = students.reduce((acc, s) => acc + s.certificates.length, 0)

      // Build chart data from already-fetched info
      const courseEnrollChart = courses
        .map(c => ({ name: c.title.length > 16 ? c.title.slice(0, 14) + 'â€¦' : c.title, students: c._count.enrollments }))
        .sort((a, b) => b.students - a.students)
        .slice(0, 6)

      const catMap = courses.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      const categoryPie = Object.entries(catMap).map(([name, value]) => ({ name, value }))

      setStats({
        totalCourses: courses.length,
        totalStudents: students.length,
        totalCertificates: totalCerts,
        totalModules,
        recentStudents: students.slice(0, 5),
        courseEnrollChart,
        categoryPie,
      })
    } catch (e) {
      console.error('Stats fetch error:', e)
    } finally {
      setLoading(false)
    }

    // Fetch activity + leaderboard independently so they don't break the page
    try {
      const res = await fetch('/api/admin/activity?limit=8')
      if (res.ok) {
        const data = await res.json()
        setRecentActivity(data.logs ?? [])
      }
    } catch { /* silently ignore */ }

    try {
      const res = await fetch('/api/admin/leaderboard')
      if (res.ok) {
        const data = await res.json()
        setLeaderboard((data.leaderboard ?? []).slice(0, 5))
      }
    } catch { /* silently ignore */ }
  }

  const statCards = stats
    ? [
        { label: 'Total Courses', value: stats.totalCourses, icon: BookOpen, color: 'from-purple-600/30 to-purple-700/10', border: 'border-purple-500/20', text: 'text-purple-300', href: '/admin/courses' },
        { label: 'Modules', value: stats.totalModules, icon: PlayCircle, color: 'from-cyan-600/30 to-cyan-700/10', border: 'border-cyan-500/20', text: 'text-cyan-300', href: '/admin/courses' },
        { label: 'Students', value: stats.totalStudents, icon: Users, color: 'from-violet-600/30 to-violet-700/10', border: 'border-violet-500/20', text: 'text-violet-300', href: '/admin/students' },
        { label: 'Certificates', value: stats.totalCertificates, icon: Award, color: 'from-amber-600/30 to-amber-700/10', border: 'border-amber-500/20', text: 'text-amber-300', href: '/admin/students' },
      ]
    : []

  const now = new Date()
  const monthName = now.toLocaleString('default', { month: 'long' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/30 via-dark-200 to-cyan-900/15 p-7">
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-36 h-36 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="badge-purple text-xs">Admin Dashboard</span>
            </div>
            <h1 className="font-display text-3xl font-bold">
              Welcome, <span className="gradient-text">Admin</span> 👋
            </h1>
            <p className="text-white/40 mt-1.5 text-sm">Manage courses, students & track live activity</p>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-2 text-center flex-shrink-0">
            {stats && [
              { v: stats.totalStudents, l: 'Students' },
              { v: stats.totalCertificates, l: 'Certs' },
            ].map(s => (
              <div key={s.l} className="bg-white/5 rounded-xl px-4 py-2.5 min-w-[70px]">
                <div className="font-display text-2xl font-bold gradient-text">{s.v}</div>
                <div className="text-xs text-white/30">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-5 shimmer h-28 rounded-2xl" />
            ))
          : statCards.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <Link href={stat.href} className="glass-card-hover p-5 group block">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} border ${stat.border} flex items-center justify-center mb-3 ${stat.text} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="font-display text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
                </Link>
              </motion.div>
            ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { href: '/admin/courses/new', icon: BookOpen,  color: 'purple', label: 'Create Course',   sub: 'Add a new course'         },
          { href: '/admin/courses',     icon: PlayCircle, color: 'cyan',   label: 'Manage Videos',   sub: 'Upload & organise links'   },
          { href: '/admin/students',    icon: Users,      color: 'violet', label: 'View Students',   sub: 'Track student progress'    },
          { href: '/admin/activity',    icon: Activity,   color: 'green',  label: 'Activity Log',    sub: 'Live login & learn events' },
        ].map((a, i) => (
          <motion.div key={a.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }}>
            <Link href={a.href} className="glass-card-hover p-5 flex items-center gap-4 group">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                a.color === 'purple' ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300' :
                a.color === 'cyan'   ? 'bg-cyan-500/20   border border-cyan-500/30   text-cyan-300'   :
                a.color === 'violet' ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300' :
                'bg-green-500/20 border border-green-500/30 text-green-300'
              }`}>
                <a.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{a.label}</div>
                <div className="text-xs text-white/40">{a.sub}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-purple-400 transition-colors" />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      {stats && (stats.courseEnrollChart.length > 0 || stats.categoryPie.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Enrollments Bar Chart */}
          {stats.courseEnrollChart.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="glass-card p-5">
              <h2 className="font-display font-semibold text-sm mb-4 flex items-center gap-2 text-white/70">
                <BookOpen className="w-4 h-4 text-purple-400" /> Students Enrolled per Course
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.courseEnrollChart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(168,85,247,0.08)' }} />
                  <Bar dataKey="students" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Category Pie Chart */}
          {stats.categoryPie.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="glass-card p-5">
              <h2 className="font-display font-semibold text-sm mb-4 flex items-center gap-2 text-white/70">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Courses by Category
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.categoryPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value" label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {stats.categoryPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#131325', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      )}

      {/* Bottom section: Recent Activity + Mini Leaderboard */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" /> Live Activity
            </h2>
            <Link href="/admin/activity" className="text-xs text-green-400 hover:text-green-300 transition-colors">View all →</Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No activity yet â€” students need to log in first</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((log, i) => (
                <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.04 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {log.user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{log.user.name}</p>
                    <p className={`text-[10px] truncate ${ACTION_COLOR[log.action] ?? 'text-white/30'}`}>
                      {log.detail ?? log.action}
                    </p>
                  </div>
                  {log.points > 0 && (
                    <span className="text-[10px] font-bold text-amber-400 flex-shrink-0">+{log.points}</span>
                  )}
                  <span className="text-[10px] text-white/25 flex-shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Mini Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> {monthName} Leaders
            </h2>
            <Link href="/admin/leaderboard" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">Full board →</Link>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No scores yet â€” earn points by logging in!</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <motion.div key={entry.userId} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-slate-500/20 text-slate-300'  :
                    i === 2 ? 'bg-orange-500/20 text-orange-400':
                    'bg-white/5 text-white/30'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : entry.rank}
                  </div>
                  <Link href={`/admin/students/${entry.userId}`} className="flex-1 text-sm font-medium hover:text-purple-300 transition-colors truncate">
                    {entry.name}
                  </Link>
                  <div className="text-sm font-bold text-amber-400 flex items-center gap-1 flex-shrink-0">
                    <Zap className="w-3 h-3" />{entry.points}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Students */}
      {stats && stats.recentStudents.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" /> Recent Students
            </h2>
            <Link href="/admin/students" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">View all →</Link>
          </div>
          <div className="space-y-2">
            {stats.recentStudents.map((s) => (
              <Link key={s.id} href={`/admin/students/${s.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {s.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.name}</div>
                  <div className="text-xs text-white/40">{s.phone}</div>
                </div>
                <div className="text-xs text-white/30">{new Date(s.createdAt).toLocaleDateString('en-IN')}</div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

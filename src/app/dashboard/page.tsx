'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BookOpen, Award, TrendingUp, CheckCircle, PlayCircle,
  ChevronRight, Brain, Loader2, Trophy, Zap, Target,
  Flame, Star, BarChart3, Clock, Sparkles,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis, Cell,
} from 'recharts'

interface ModuleProgress {
  moduleId: string
  videoCompleted: boolean
  testPassed: boolean
  testScore: number | null
}

interface Enrollment {
  id: string
  enrolledAt: string
  course: {
    id: string
    title: string
    category: string
    thumbnail?: string
    modules: Array<{ id: string; title: string; order: number }>
  }
  moduleProgress: ModuleProgress[]
}

interface Certificate {
  id: string
  issuedAt: string
  course: { id: string; title: string }
}

const CATEGORY_PRESETS: Record<string, { gradient: string; bg: string; text: string; icon: string }> = {
  'AI & Data Science':  { gradient: 'from-purple-600 via-violet-600 to-cyan-500', bg: 'bg-purple-500/10', text: 'text-purple-300', icon: '🤖' },
  'Web Development':    { gradient: 'from-orange-500 via-amber-500 to-yellow-400', bg: 'bg-orange-500/10', text: 'text-orange-300', icon: '🌐' },
  'Database & SQL':     { gradient: 'from-blue-600 via-blue-500 to-teal-400', bg: 'bg-blue-500/10', text: 'text-blue-300', icon: '🗄️' },
  'Cybersecurity':      { gradient: 'from-red-600 via-rose-500 to-orange-400', bg: 'bg-red-500/10', text: 'text-red-300', icon: '🔐' },
  'Machine Learning':   { gradient: 'from-violet-600 via-purple-500 to-indigo-500', bg: 'bg-violet-500/10', text: 'text-violet-300', icon: '🧠' },
  'Python':             { gradient: 'from-yellow-500 via-green-500 to-teal-500', bg: 'bg-yellow-500/10', text: 'text-yellow-300', icon: '🐍' },
  'Mobile Development': { gradient: 'from-sky-500 via-blue-500 to-indigo-600', bg: 'bg-sky-500/10', text: 'text-sky-300', icon: '📱' },
  'DevOps':             { gradient: 'from-slate-500 via-gray-600 to-zinc-500', bg: 'bg-slate-500/10', text: 'text-slate-300', icon: '⚙️' },
  'Cloud Computing':    { gradient: 'from-cyan-500 via-sky-500 to-blue-600', bg: 'bg-cyan-500/10', text: 'text-cyan-300', icon: '☁️' },
  'Networking':         { gradient: 'from-emerald-500 via-teal-500 to-cyan-600', bg: 'bg-emerald-500/10', text: 'text-emerald-300', icon: '🔗' },
}
const DYNAMIC_POOL = [
  { gradient: 'from-pink-500 via-fuchsia-500 to-purple-600', bg: 'bg-pink-500/10', text: 'text-pink-300' },
  { gradient: 'from-lime-500 via-green-500 to-emerald-600', bg: 'bg-lime-500/10', text: 'text-lime-300' },
  { gradient: 'from-amber-500 via-orange-500 to-red-500', bg: 'bg-amber-500/10', text: 'text-amber-300' },
  { gradient: 'from-indigo-500 via-blue-500 to-cyan-500', bg: 'bg-indigo-500/10', text: 'text-indigo-300' },
  { gradient: 'from-teal-500 via-cyan-500 to-sky-500', bg: 'bg-teal-500/10', text: 'text-teal-300' },
]
const DYNAMIC_ICONS = ['📚', '🎯', '💡', '🚀', '⭐', '🔬', '🎓', '💻']
function strHash(s: string): number {
  let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return Math.abs(h)
}
function getCat(cat: string) {
  if (CATEGORY_PRESETS[cat]) return CATEGORY_PRESETS[cat]
  const h = strHash(cat); return { ...DYNAMIC_POOL[h % DYNAMIC_POOL.length], icon: DYNAMIC_ICONS[h % DYNAMIC_ICONS.length] }
}

export default function DashboardPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/student/enrollments').then(r => r.json()),
      fetch('/api/student/certificates').then(r => r.json()),
    ]).then(([me, enr, certs]) => {
      setUser(me)
      setEnrollments(Array.isArray(enr) ? enr : [])
      setCertificates(Array.isArray(certs) ? certs : [])
      setLoading(false)
    })
  }, [])

  const totalModules = enrollments.reduce((a, e) => a + e.course.modules.length, 0)
  const completedModules = enrollments.reduce((a, e) => a + e.moduleProgress.filter(p => p.testPassed).length, 0)
  const overallProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0
  const completedCourses = enrollments.filter(e => {
    const total = e.course.modules.length
    const done = e.moduleProgress.filter(p => p.testPassed).length
    return total > 0 && done === total
  }).length

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const avgTestScore = (() => {
    const scores = enrollments.flatMap(e =>
      e.moduleProgress.filter(p => p.testScore !== null).map(p => p.testScore as number))
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  })()

  const videosWatched = enrollments.reduce((a, e) =>
    a + e.moduleProgress.filter(p => p.videoCompleted).length, 0)

  const categoryMap = enrollments.reduce((acc, e) => {
    acc[e.course.category] = (acc[e.course.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const continueCourse = enrollments.find(e => {
    const done = e.moduleProgress.filter(p => p.testPassed).length
    const total = e.course.modules.length
    return total > 0 && done > 0 && done < total
  }) ?? enrollments.find(e =>
    e.course.modules.length > 0 && e.moduleProgress.filter(p => p.testPassed).length === 0
  )

  // Chart data
  const testScoreData = enrollments.flatMap(e =>
    e.moduleProgress
      .filter(p => p.testScore !== null)
      .map(p => {
        const mod = e.course.modules.find(m => m.id === p.moduleId)
        return {
          label: `M${mod?.order ?? '?'}`,
          fullLabel: `${e.course.title.length > 14 ? e.course.title.slice(0, 12) + '…' : e.course.title} · M${mod?.order ?? '?'}`,
          score: p.testScore as number,
        }
      })
  )

  const progressPie = [
    { name: 'Completed', value: completedCourses, fill: '#10b981' },
    { name: 'In Progress', value: enrollments.length - completedCourses, fill: '#a855f7' },
  ].filter(d => d.value > 0)

  const milestones = [    ...certificates.map(c => ({
      type: 'cert' as const,
      date: new Date(c.issuedAt),
      label: 'Earned certificate for',
      title: c.course.title,
      color: 'amber' as const,
    })),
    ...enrollments.map(e => ({
      type: 'enroll' as const,
      date: new Date(e.enrolledAt),
      label: 'Enrolled in',
      title: e.course.title,
      color: 'purple' as const,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )

  return (
    <div className="space-y-7">

      {/* Hero Welcome Card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 via-dark-200 to-cyan-900/20 p-7"
      >
        {/* BG glow blobs */}
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="text-white/40 text-sm mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> {greeting}
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Welcome back, <span className="gradient-text">{user?.name || 'Student'}</span> 👋
            </h1>
            <p className="text-white/40 text-sm">Keep up the momentum — you&apos;re doing great!</p>
          </div>
          <div className="hidden md:flex flex-col items-center gap-1 flex-shrink-0">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="44" cy="44" r="36" fill="none"
                  stroke="url(#prog)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - overallProgress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                />
                <defs>
                  <linearGradient id="prog" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display font-bold text-xl gradient-text">{Math.round(overallProgress)}%</span>
                <span className="text-white/30 text-[9px]">progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar (mobile) */}
        <div className="md:hidden mt-4">
          <div className="flex justify-between text-xs text-white/40 mb-1.5">
            <span>Overall Progress</span>
            <span className="gradient-text font-bold">{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }} transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Continue Learning Banner */}
      {continueCourse && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-900/20 via-dark-200 to-purple-900/15 p-5"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/25 to-purple-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-cyan-400/70 uppercase tracking-wider font-semibold mb-0.5">
                {continueCourse.moduleProgress.filter(p => p.testPassed).length > 0 ? '▶ Continue where you left off' : '🚀 Ready to start learning'}
              </p>
              <h3 className="font-display font-bold truncate">{continueCourse.course.title}</h3>
              <p className="text-xs text-white/40 mt-0.5">
                {continueCourse.moduleProgress.filter(p => p.testPassed).length}/{continueCourse.course.modules.length} modules complete
                {continueCourse.course.modules.length > 0 && ` · ${Math.round(continueCourse.moduleProgress.filter(p => p.testPassed).length / continueCourse.course.modules.length * 100)}% done`}
              </p>
            </div>
            <Link
              href={`/dashboard/courses/${continueCourse.course.id}`}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/15"
            >
              {continueCourse.moduleProgress.filter(p => p.testPassed).length > 0 ? 'Resume' : 'Start'} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {continueCourse.course.modules.length > 0 && (
            <div className="mt-3">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(continueCourse.moduleProgress.filter(p => p.testPassed).length / continueCourse.course.modules.length * 100)}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, val: enrollments.length, label: 'Enrolled', color: 'purple', sub: 'courses' },
          { icon: Target, val: completedModules, label: 'Modules', color: 'cyan', sub: 'completed' },
          { icon: Flame, val: completedCourses, label: 'Courses', color: 'amber', sub: 'finished' },
          { icon: Trophy, val: certificates.length, label: 'Certificates', color: 'green', sub: 'earned' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
            className={`relative overflow-hidden glass-card p-5 text-center group hover:scale-105 transition-transform duration-200 cursor-default`}
          >
            <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-3 ${
              s.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
              s.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400' :
              s.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="font-display text-2xl font-bold gradient-text">{s.val}</div>
            <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
            <div className="text-[10px] text-white/20">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Learning Insights */}
      {enrollments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Avg Test Score */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="glass-card p-5 flex items-center gap-4"
          >
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="23" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle cx="30" cy="30" r="23" fill="none"
                  stroke="url(#scoreGrad)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 23}`}
                  strokeDashoffset={`${2 * Math.PI * 23 * (1 - (avgTestScore ?? 0) / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold gradient-text">
                  {avgTestScore !== null ? `${avgTestScore}%` : '—'}
                </span>
              </div>
            </div>
            <div>
              <div className="font-display text-sm font-bold text-white/80">Avg Test Score</div>
              <div className="text-xs text-white/40 mt-0.5">across all modules</div>
              {avgTestScore !== null ? (
                <div className={`text-[10px] mt-1.5 px-2 py-0.5 rounded-full inline-block font-medium ${
                  avgTestScore >= 80 ? 'bg-green-500/20 text-green-300' :
                  avgTestScore >= 60 ? 'bg-amber-500/20 text-amber-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {avgTestScore >= 80 ? '🌟 Excellent' : avgTestScore >= 60 ? '👍 Good' : '📈 Keep going'}
                </div>
              ) : (
                <div className="text-[10px] mt-1.5 text-white/20">No tests taken yet</div>
              )}
            </div>
          </motion.div>

          {/* Learning DNA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}
            className="glass-card p-5"
          >
            <p className="text-xs text-white/40 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Your Learning DNA
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(categoryMap).map(([cat, count]) => {
                const style = getCat(cat)
                return (
                  <span key={cat} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-white/10 ${style.bg} ${style.text}`}>
                    {style.icon} {cat.length > 14 ? cat.split(' ').slice(0, 2).join(' ') : cat}
                    {count > 1 && <span className="opacity-50 text-[10px]">×{count}</span>}
                  </span>
                )
              })}
            </div>
          </motion.div>

          {/* Module Progress Bars */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
            className="glass-card p-5 space-y-3"
          >
            <p className="text-xs text-white/40 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" /> Module Completion
            </p>
            {[
              { label: 'Videos Watched', val: videosWatched,    total: totalModules, from: 'from-cyan-500',  to: 'to-blue-500',    color: 'text-cyan-400'  },
              { label: 'Tests Passed',   val: completedModules, total: totalModules, from: 'from-green-500', to: 'to-emerald-400', color: 'text-green-400' },
            ].map(b => {
              const pct = b.total > 0 ? Math.round((b.val / b.total) * 100) : 0
              return (
                <div key={b.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-white/50">{b.label}</span>
                    <span className={`text-[11px] font-medium ${b.color}`}>{b.val}/{b.total}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.5, duration: 0.8 }}
                      className={`h-full bg-gradient-to-r ${b.from} ${b.to} rounded-full`}
                    />
                  </div>
                </div>
              )
            })}
          </motion.div>
        </div>
      )}

      {/* ── Performance Analytics Charts ── */}
      {enrollments.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
          <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-cyan-400" /> Performance Analytics
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Test Scores Bar Chart */}
            <div className="glass-card p-5">
              <p className="text-xs text-white/40 mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" /> Test Scores by Module
              </p>
              {testScoreData.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-white/20 text-sm">No test scores yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={testScoreData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: number) => [`${v}%`, 'Score']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
                      contentStyle={{ background: '#131325', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {testScoreData.map((d, i) => (
                        <Cell key={i} fill={d.score >= 80 ? '#10b981' : d.score >= 60 ? '#f59e0b' : '#f43f5e'} opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Progress Radial Chart */}
            <div className="glass-card p-5">
              <p className="text-xs text-white/40 mb-3 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-purple-400" /> Course Progress Overview
              </p>
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <ResponsiveContainer width={130} height={130}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="90%"
                      data={[{ name: 'progress', value: Math.round(overallProgress), fill: 'url(#progGrad)' }]}
                      startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.06)' }} />
                      <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle"
                        style={{ fill: '#a855f7', fontSize: 22, fontWeight: 700 }}>
                        {Math.round(overallProgress)}%
                      </text>
                      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle"
                        style={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                        overall
                      </text>
                      <defs>
                        <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                      </defs>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {[
                    { label: 'Completed Courses', val: completedCourses, total: enrollments.length, color: 'bg-green-500', text: 'text-green-400' },
                    { label: 'Modules Passed', val: completedModules, total: totalModules, color: 'bg-purple-500', text: 'text-purple-400' },
                    { label: 'Videos Watched', val: videosWatched, total: totalModules, color: 'bg-cyan-500', text: 'text-cyan-400' },
                  ].map(row => {
                    const pct = row.total > 0 ? Math.round((row.val / row.total) * 100) : 0
                    return (
                      <div key={row.label}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-white/40">{row.label}</span>
                          <span className={row.text}>{row.val}/{row.total}</span>
                        </div>
                        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.6, duration: 0.8 }}
                            className={`h-full ${row.color} rounded-full`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Legend */}
              {progressPie.length > 0 && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                  {progressPie.map(p => (
                    <div key={p.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
                      <span className="text-white/40">{p.name}</span>
                      <span className="font-semibold text-white/70">{p.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Enrolled Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" /> My Courses
          </h2>
          <Link href="/dashboard/courses" className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {enrollments.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
            <Brain className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 mb-4">No courses enrolled yet</p>
            <Link href="/dashboard/courses" className="btn-primary inline-flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4" /> Explore Courses
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {enrollments.slice(0, 3).map((enr, i) => {
              const cat = getCat(enr.course.category)
              const modules = enr.course.modules
              const done = enr.moduleProgress.filter(p => p.testPassed).length
              const total = modules.length
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              const isComplete = done === total && total > 0
              const nextMod = modules.find(m => !enr.moduleProgress.find(mp => mp.moduleId === m.id)?.testPassed)

              return (
                <motion.div key={enr.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }}
                  className={`relative rounded-2xl border overflow-hidden transition-all duration-300
                    ${isComplete
                      ? 'border-green-500/40 bg-green-500/5 shadow-lg shadow-green-500/10'
                      : 'border-purple-500/30 bg-purple-500/5 shadow-lg shadow-purple-500/8'
                    }`}
                >
                  {/* Gradient top bar */}
                  <div className={`h-2.5 w-full bg-gradient-to-r ${cat.gradient}`} />

                  {/* Thumbnail */}
                  <div className="relative h-32 overflow-hidden">
                    {enr.course.thumbnail ? (
                      <img src={enr.course.thumbnail} alt={enr.course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${cat.gradient} opacity-20`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Category badge */}
                    <div className="absolute bottom-2.5 left-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cat.bg} ${cat.text} backdrop-blur-sm border border-white/10`}>
                        {cat.icon} {enr.course.category}
                      </span>
                    </div>
                    {/* Status badge */}
                    <div className="absolute top-2.5 right-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
                        isComplete
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>{isComplete ? '✓ Done' : `${pct}%`}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-display font-bold text-sm leading-tight mb-2 line-clamp-1">{enr.course.title}</h3>

                    {/* Module dots */}
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      {modules.map(mod => {
                        const p = enr.moduleProgress.find(mp => mp.moduleId === mod.id)
                        return (
                          <span key={mod.id} className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                            p?.testPassed ? 'bg-green-500/20 text-green-300' :
                            p?.videoCompleted ? 'bg-amber-500/20 text-amber-300' :
                            'bg-white/5 text-white/20'
                          }`}>M{mod.order}</span>
                        )
                      })}
                      <span className="text-white/20 text-[10px]">
                        {isComplete ? '🎉' : nextMod ? `→ M${nextMod.order}` : ''}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-white/30 mb-1">
                        <span>{done}/{total} modules</span>
                        <span className={isComplete ? 'text-green-400' : 'text-purple-400'}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.4 + i * 0.07, duration: 0.8 }}
                          className={`h-full rounded-full bg-gradient-to-r ${isComplete ? 'from-green-500 to-emerald-400' : cat.gradient}`}
                        />
                      </div>
                    </div>

                    {/* Action */}
                    <div className="pt-2 border-t border-white/5">
                      <Link href={`/dashboard/courses/${enr.course.id}`}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r ${cat.gradient} text-white hover:opacity-90 transition-all`}
                      >
                        {isComplete ? <>🏆 Review Course</> : <><PlayCircle className="w-3.5 h-3.5" /> Continue <ChevronRight className="w-3.5 h-3.5" /></>}
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Certificates strip */}
      {certificates.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Certificates
            </h2>
            <Link href="/dashboard/certificates" className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {certificates.slice(0, 3).map((cert, i) => (
              <motion.div key={cert.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.07 }}>
                <Link href="/dashboard/certificates"
                  className="block group rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200"
                >
                  {/* Gold gradient bar */}
                  <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300" />
                  {/* Banner */}
                  <div className="relative h-20 bg-gradient-to-br from-amber-900/40 to-yellow-900/20 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-yellow-600/20 border border-amber-500/30 flex items-center justify-center shadow-lg">
                      <Star className="w-6 h-6 text-amber-300" />
                    </div>
                    <div className="absolute top-2 right-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/25 font-medium">✓ Earned</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-display font-bold text-sm line-clamp-1 group-hover:text-amber-200 transition-colors mb-1">{cert.course.title}</p>
                    <p className="text-xs text-amber-400/50 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(cert.issuedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-white/20 font-mono">{cert.id.slice(0, 8)}…</span>
                      <Award className="w-3.5 h-3.5 text-amber-400/40 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Activity Timeline */}
      {milestones.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-400" /> Recent Activity
            </h2>
          </div>
          <div className="glass-card p-4">
            <div className="space-y-0">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-3 relative">
                  {i < milestones.length - 1 && (
                    <div className="absolute left-[18px] top-9 bottom-0 w-px bg-white/5" />
                  )}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 z-10 ${
                    m.color === 'amber' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {m.type === 'cert' ? <Trophy className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </div>
                  <div className={`flex-1 py-2.5 ${i < milestones.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <p className="text-sm font-medium leading-snug">
                      {m.label} <span className={m.color === 'amber' ? 'text-amber-300' : 'text-purple-300'}>{m.title}</span>
                    </p>
                    <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {m.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* CTA if no enrollments */}
      {enrollments.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/30 to-cyan-900/20 p-8 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-cyan-600/5 pointer-events-none" />
          <Brain className="w-14 h-14 text-purple-400/40 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold mb-2">Start Your Learning Journey</h3>
          <p className="text-white/40 text-sm mb-5 max-w-md mx-auto">Explore our courses and enroll in the ones that match your goals.</p>
          <Link href="/dashboard/courses" className="btn-primary inline-flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Browse Courses
          </Link>
        </motion.div>
      )}
    </div>
  )
}

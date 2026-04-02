'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  BookOpen, Users, ChevronRight, Plus, Loader2,
  CheckCircle, PlayCircle, HelpCircle, Layers, Search,
  Filter, Clock, Trophy,
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  category: string
  thumbnail?: string
  modules: Array<{
    id: string
    title: string
    order: number
    _count: { videos: number; questions: number }
  }>
  _count: { enrollments: number }
}

interface Enrollment {
  course: { id: string }
  moduleProgress: Array<{ moduleId: string; testPassed: boolean }>
  // Also contains course.modules for counting
  [key: string]: unknown
}

const CATEGORY_PRESETS: Record<string, { gradient: string; bg: string; text: string; icon: string }> = {
  'AI & Data Science':  { gradient: 'from-purple-600 via-violet-600 to-cyan-500', bg: 'bg-purple-500/10', text: 'text-purple-300', icon: '🤖' },
  'Web Development':    { gradient: 'from-orange-500 via-amber-500 to-yellow-400', bg: 'bg-orange-500/10', text: 'text-orange-300', icon: '🌐' },
  'Database & SQL':     { gradient: 'from-blue-600 via-blue-500 to-teal-400', bg: 'bg-blue-500/10', text: 'text-blue-300', icon: '🗄️' },
  'Cybersecurity':      { gradient: 'from-zinc-500 via-gray-400 to-slate-400', bg: 'bg-zinc-500/10', text: 'text-zinc-300', icon: '🔐' },
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
  { gradient: 'from-amber-500 via-orange-500 to-yellow-500', bg: 'bg-amber-500/10', text: 'text-amber-300' },
  { gradient: 'from-indigo-500 via-blue-500 to-cyan-500', bg: 'bg-indigo-500/10', text: 'text-indigo-300' },
  { gradient: 'from-slate-400 via-zinc-500 to-gray-600', bg: 'bg-slate-500/10', text: 'text-slate-300' },
  { gradient: 'from-teal-500 via-cyan-500 to-sky-500', bg: 'bg-teal-500/10', text: 'text-teal-300' },
  { gradient: 'from-violet-500 via-purple-600 to-pink-500', bg: 'bg-violet-500/10', text: 'text-violet-300' },
  { gradient: 'from-yellow-400 via-amber-500 to-orange-600', bg: 'bg-yellow-500/10', text: 'text-yellow-300' },
]
const DYNAMIC_ICONS = ['📚', '🎯', '💡', '🚀', '⭐', '🔬', '🎓', '💻', '🌟', '🛠️', '📊', '🎨']
function strHash(s: string): number {
  let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return Math.abs(h)
}
function getCat(cat: string) {
  if (CATEGORY_PRESETS[cat]) return CATEGORY_PRESETS[cat]
  const h = strHash(cat); return { ...DYNAMIC_POOL[h % DYNAMIC_POOL.length], icon: DYNAMIC_ICONS[h % DYNAMIC_ICONS.length] }
}

type FilterTab = 'all' | 'inprogress' | 'completed'

export default function StudentCoursesPage() {
  const [available, setAvailable] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<FilterTab>('all')

  useEffect(() => {
    Promise.all([
      fetch('/api/student/courses').then(r => r.json()),
      fetch('/api/student/enrollments').then(r => r.json()),
    ]).then(([courses, enrs]) => {
      setAvailable(Array.isArray(courses) ? courses : [])
      setEnrollments(Array.isArray(enrs) ? enrs : [])
      setLoading(false)
    })
  }, [])

  async function handleEnroll(courseId: string) {
    setEnrolling(courseId)
    try {
      const res = await fetch('/api/student/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Enrolled successfully!')
      setEnrollments(prev => [...prev, { course: { id: courseId }, moduleProgress: [] }])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to enroll')
    } finally {
      setEnrolling(null)
    }
  }

  // Build a map of courseId -> { enrolled, done, total }
  const progressMap = new Map<string, { done: number; total: number }>()
  enrollments.forEach(enr => {
    const cid = enr.course.id
    const enrCourse = enr as unknown as { course: { modules?: Array<{ id: string }> }; moduleProgress: Array<{ moduleId: string; testPassed: boolean }> }
    const total = enrCourse.course?.modules?.length ?? 0
    const done = enrCourse.moduleProgress.filter(p => p.testPassed).length
    progressMap.set(cid, { done, total })
  })

  const enrolledIds = new Set(enrollments.map(e => e.course.id))

  function isCompleted(id: string) {
    const p = progressMap.get(id); return !!p && p.total > 0 && p.done === p.total
  }
  function isInProgress(id: string) {
    return enrolledIds.has(id) && !isCompleted(id)
  }

  const counts = {
    all: available.length,
    inprogress: available.filter(c => isInProgress(c.id)).length,
    completed: available.filter(c => isCompleted(c.id)).length,
  }

  const filtered = available.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (tab === 'inprogress') return isInProgress(c.id)
    if (tab === 'completed') return isCompleted(c.id)
    return true
  })

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )

  const tabs: { key: FilterTab; label: string; icon: React.ElementType; count: number; color: string }[] = [
    { key: 'all', label: 'All Courses', icon: BookOpen, count: counts.all, color: 'purple' },
    { key: 'inprogress', label: 'In Progress', icon: Clock, count: counts.inprogress, color: 'amber' },
    { key: 'completed', label: 'Completed', icon: Trophy, count: counts.completed, color: 'green' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h1 className="font-display text-3xl font-bold gradient-text">Available Courses</h1>
        <p className="text-white/40 mt-1">Enroll in courses and start learning</p>
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            className="input-field pl-10 py-2.5 text-sm w-full"
            placeholder="Search courses by title or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-white/5 border border-white/8">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.key
                  ? t.color === 'amber'
                    ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                    : t.color === 'green'
                    ? 'bg-green-500/20 text-green-300 shadow-sm'
                    : 'bg-purple-500/20 text-purple-300 shadow-sm'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                tab === t.key
                  ? t.color === 'amber' ? 'bg-amber-500/30' : t.color === 'green' ? 'bg-green-500/30' : 'bg-purple-500/30'
                  : 'bg-white/10'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-20 text-center">
          {tab === 'completed' ? <Trophy className="w-14 h-14 text-white/10 mx-auto mb-4" /> : <BookOpen className="w-14 h-14 text-white/10 mx-auto mb-4" />}
          <p className="text-white/30 text-lg">
            {tab === 'inprogress' ? 'No courses in progress' : tab === 'completed' ? 'No completed courses yet' : search ? 'No courses match your search' : 'No courses available'}
          </p>
          {tab === 'completed' && <p className="text-white/20 text-sm mt-1">Complete all modules to earn your certificate</p>}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((course, i) => {
            const cat = getCat(course.category)
            const isEnrolled = enrolledIds.has(course.id)
            const completed = isCompleted(course.id)
            const prog = progressMap.get(course.id)
            const totalVids = course.modules.reduce((a, m) => a + (m._count?.videos ?? 0), 0)
            const totalQs = course.modules.reduce((a, m) => a + (m._count?.questions ?? 0), 0)
            const progressPct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative rounded-2xl border overflow-hidden transition-all duration-300
                  ${completed
                    ? 'border-green-500/40 bg-green-500/5 shadow-lg shadow-green-500/10'
                    : isEnrolled
                    ? 'border-purple-500/40 bg-purple-500/5 shadow-lg shadow-purple-500/10'
                    : 'border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5 hover:shadow-xl hover:shadow-black/30'
                  }`}
              >
                {/* Gradient top bar */}
                <div className={`h-2.5 w-full bg-gradient-to-r ${cat.gradient}`} />

                {/* Thumbnail */}
                <div className="relative h-36 overflow-hidden">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${cat.gradient} opacity-20`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2.5 left-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cat.bg} ${cat.text} backdrop-blur-sm border border-white/10`}>
                      <span>{cat.icon}</span> {course.category}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-3">
                    {completed ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Completed
                      </span>
                    ) : isEnrolled ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Enrolled
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h2 className="font-display font-bold text-base leading-tight mb-1">{course.title}</h2>
                  <p className="text-white/40 text-xs line-clamp-2 mb-3 leading-relaxed">{course.description}</p>

                  {/* Progress bar for enrolled */}
                  {isEnrolled && prog && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>{prog.done}/{prog.total} modules</span>
                        <span className={completed ? 'text-green-400' : 'text-purple-400'}>{progressPct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ delay: i * 0.05 + 0.3, duration: 0.8 }}
                          className={`h-full rounded-full bg-gradient-to-r ${completed ? 'from-green-500 to-emerald-400' : cat.gradient}`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {[
                      { icon: Layers, val: course.modules.length, label: 'Modules' },
                      { icon: PlayCircle, val: totalVids, label: 'Videos' },
                      { icon: HelpCircle, val: totalQs, label: 'Quizzes' },
                      { icon: Users, val: course._count.enrollments, label: 'Students' },
                    ].map(stat => (
                      <div key={stat.label} className="flex flex-col items-center py-1.5 rounded-lg bg-white/3 border border-white/5">
                        <stat.icon className="w-3 h-3 text-white/30 mb-0.5" />
                        <span className="text-sm font-bold">{stat.val}</span>
                        <span className="text-white/25 text-[9px] leading-tight">{stat.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Module pills */}
                  {course.modules.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {course.modules.map(m => (
                        <span key={m.id} className={`text-xs px-2 py-0.5 rounded-full ${cat.bg} ${cat.text} border border-white/5`}>
                          M{m.order}: {m._count?.videos ?? 0}v {m._count?.questions ?? 0}q
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action */}
                  <div className="pt-2 border-t border-white/5">
                    {isEnrolled ? (
                      <Link
                        href={`/dashboard/courses/${course.id}`}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r ${cat.gradient} text-white hover:opacity-90 transition-all`}
                      >
                        {completed ? <><Trophy className="w-3.5 h-3.5" /> Review Course</> : <><PlayCircle className="w-3.5 h-3.5" /> Continue Learning <ChevronRight className="w-3.5 h-3.5" /></>}
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={!!enrolling}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r ${cat.gradient} text-white hover:opacity-90 transition-all disabled:opacity-50`}
                      >
                        {enrolling === course.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> Enroll Now</>}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

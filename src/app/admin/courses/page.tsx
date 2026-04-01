'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, ChevronRight, Users, PlayCircle, HelpCircle,
  Eye, EyeOff, Trash2, Search, Zap, AlertTriangle, X,
  CheckSquare, Square, Layers, TrendingUp, Globe,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Course {
  id: string
  title: string
  description: string
  category: string
  isPublished: boolean
  thumbnail?: string
  createdAt: string
  modules: Array<{
    id: string
    title: string
    order: number
    _count: { videos: number; questions: number }
  }>
  _count: { enrollments: number }
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
  { gradient: 'from-rose-500 via-pink-500 to-fuchsia-600', bg: 'bg-rose-500/10', text: 'text-rose-300' },
  { gradient: 'from-teal-500 via-cyan-500 to-sky-500', bg: 'bg-teal-500/10', text: 'text-teal-300' },
  { gradient: 'from-violet-500 via-purple-600 to-pink-500', bg: 'bg-violet-500/10', text: 'text-violet-300' },
  { gradient: 'from-yellow-400 via-amber-500 to-orange-600', bg: 'bg-yellow-500/10', text: 'text-yellow-300' },
]

const DYNAMIC_ICONS = ['📚', '🎯', '💡', '🚀', '⭐', '🔬', '🎓', '💻', '🌟', '🛠️', '📊', '🎨']

function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function getCat(cat: string) {
  if (CATEGORY_PRESETS[cat]) return CATEGORY_PRESETS[cat]
  const h = strHash(cat)
  const pool = DYNAMIC_POOL[h % DYNAMIC_POOL.length]
  const icon = DYNAMIC_ICONS[h % DYNAMIC_ICONS.length]
  return { ...pool, icon }
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)  // single delete confirm
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    try {
      const res = await fetch('/api/admin/courses')
      const data = await res.json()
      setCourses(data)
    } finally {
      setLoading(false)
    }
  }

  async function togglePublish(course: Course) {
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...course, isPublished: !course.isPublished }),
      })
      if (!res.ok) throw new Error()
      toast.success(course.isPublished ? 'Course unpublished' : 'Course published!')
      fetchCourses()
    } catch {
      toast.error('Failed to update')
    }
  }

  async function deleteCourse(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Course deleted')
      setDeleteTarget(null)
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
      fetchCourses()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  async function bulkDelete() {
    setDeleting(true)
    try {
      await Promise.all([...selected].map(id => fetch(`/api/admin/courses/${id}`, { method: 'DELETE' })))
      toast.success(`${selected.size} course${selected.size > 1 ? 's' : ''} deleted`)
      setSelected(new Set())
      setBulkConfirm(false)
      fetchCourses()
    } catch {
      toast.error('Some deletions failed')
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(c => c.id)))
  }

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase())
  )

  const totalVideos = courses.reduce((a, c) => a + c.modules.reduce((b, m) => b + m._count.videos, 0), 0)
  const totalStudents = courses.reduce((a, c) => a + c._count.enrollments, 0)
  const publishedCount = courses.filter(c => c.isPublished).length

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">Courses</h1>
          <p className="text-white/40 mt-1">Manage your learning content</p>
        </div>
        <Link href="/admin/courses/new"
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Course
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total Courses', value: courses.length, icon: BookOpen, color: 'purple' },
          { label: 'Published', value: publishedCount, icon: Globe, color: 'green' },
          { label: 'Total Videos', value: totalVideos, icon: PlayCircle, color: 'cyan' },
          { label: 'Enrollments', value: totalStudents, icon: Users, color: 'amber' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="glass-card p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              s.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
              s.color === 'green' ? 'bg-green-500/20 text-green-400' :
              s.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400' :
              'bg-amber-500/20 text-amber-400'
            }`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search + Select All */}
      <div className="flex gap-3 mb-5 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            className="input-field pl-10 py-2.5 text-sm w-full"
            placeholder="Search courses by title or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {filtered.length > 0 && (
          <button onClick={toggleSelectAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60 hover:text-white"
          >
            {selected.size === filtered.length && filtered.length > 0
              ? <CheckSquare className="w-4 h-4 text-purple-400" />
              : <Square className="w-4 h-4" />
            }
            {selected.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="glass-card h-64 shimmer rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-20 text-center">
          <BookOpen className="w-14 h-14 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-lg">{search ? 'No courses match your search' : 'No courses yet'}</p>
          {!search && (
            <Link href="/admin/courses/new" className="btn-primary inline-flex items-center gap-2 mt-5 text-sm">
              <Plus className="w-4 h-4" /> Create First Course
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((course, i) => {
            const cat = getCat(course.category)
            const totalVids = course.modules.reduce((a, m) => a + m._count.videos, 0)
            const totalQs = course.modules.reduce((a, m) => a + m._count.questions, 0)
            const isSelected = selected.has(course.id)
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative group rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer
                  ${isSelected
                    ? 'border-purple-500/60 bg-purple-500/5 shadow-lg shadow-purple-500/10'
                    : 'border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5 hover:shadow-xl hover:shadow-black/30'
                  }`}
                style={{ '--tw-shadow-color': 'rgba(139,92,246,0.15)' } as React.CSSProperties}
              >
                {/* Select checkbox */}
                <button
                  onClick={() => toggleSelect(course.id)}
                  className="absolute top-3 left-3 z-10 w-6 h-6 flex items-center justify-center rounded-md bg-black/40 backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ opacity: isSelected ? 1 : undefined }}
                >
                  {isSelected
                    ? <CheckSquare className="w-4 h-4 text-purple-400" />
                    : <Square className="w-3.5 h-3.5 text-white/40" />
                  }
                </button>

                {/* Gradient Banner */}
                <div className={`h-2.5 w-full bg-gradient-to-r ${cat.gradient}`} />

                {/* Thumbnail / Gradient fallback */}
                <div className="relative h-36 overflow-hidden">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${cat.gradient} opacity-20`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badges over image */}
                  <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cat.bg} ${cat.text} backdrop-blur-sm border border-white/10`}>
                      <span>{cat.icon}</span> {course.category}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm border ${
                      course.isPublished
                        ? 'bg-green-500/20 text-green-300 border-green-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}>
                      {course.isPublished ? '● Live' : '○ Draft'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h2 className="font-display font-bold text-base leading-tight mb-1 group-hover:text-white transition-colors">
                    {course.title}
                  </h2>
                  <p className="text-white/40 text-xs line-clamp-2 mb-3 leading-relaxed">{course.description}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {[
                      { icon: Layers, val: course.modules.length, label: 'Modules' },
                      { icon: PlayCircle, val: totalVids, label: 'Videos' },
                      { icon: HelpCircle, val: totalQs, label: 'Questions' },
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
                          M{m.order}: {m._count.videos}v {m._count.questions}q
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => togglePublish(course)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        course.isPublished
                          ? 'bg-white/5 text-white/40 hover:bg-red-500/15 hover:text-red-300'
                          : 'bg-white/5 text-white/40 hover:bg-green-500/15 hover:text-green-300'
                      }`}
                    >
                      {course.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {course.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r ${cat.gradient} text-white hover:opacity-90 transition-all`}
                    >
                      Manage <ChevronRight className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(course.id)}
                      className="w-8 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-3 rounded-2xl bg-dark-200 border border-white/10 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 text-sm">
              <CheckSquare className="w-4 h-4 text-purple-400" />
              <span className="font-semibold">{selected.size}</span>
              <span className="text-white/50">course{selected.size > 1 ? 's' : ''} selected</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <button onClick={() => setSelected(new Set())} className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
            <button
              onClick={() => setBulkConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single Delete Confirm Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card gradient-border p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="font-display font-bold text-lg text-center mb-2">Delete Course?</h3>
              <p className="text-white/40 text-sm text-center mb-6">
                This will permanently delete the course, all its modules, videos, questions, enrollments, and certificates from the database.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button onClick={() => deleteCourse(deleteTarget)} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirm Modal */}
      <AnimatePresence>
        {bulkConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setBulkConfirm(false)}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card gradient-border p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="font-display font-bold text-lg text-center mb-2">Delete {selected.size} Courses?</h3>
              <p className="text-white/40 text-sm text-center mb-6">
                All selected courses and their data (modules, videos, questions, enrollments) will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setBulkConfirm(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button onClick={bulkDelete} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : `Delete All ${selected.size}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

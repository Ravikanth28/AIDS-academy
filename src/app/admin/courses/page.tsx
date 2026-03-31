'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Plus, ChevronRight, Users, PlayCircle, HelpCircle, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface Course {
  id: string
  title: string
  description: string
  category: string
  isPublished: boolean
  createdAt: string
  modules: Array<{
    id: string
    title: string
    order: number
    _count: { videos: number; questions: number }
  }>
  _count: { enrollments: number }
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourses()
  }, [])

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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">
            <span className="gradient-text">Courses</span>
          </h1>
          <p className="text-white/40 mt-1">Manage your learning content</p>
        </div>
        <Link href="/admin/courses/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Course
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="glass-card h-32 shimmer rounded-2xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 mb-4">No courses yet</p>
          <Link href="/admin/courses/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create First Course
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="glass-card-hover p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h2 className="font-display font-semibold text-lg">{course.title}</h2>
                    <span className={`badge-${course.isPublished ? 'green' : 'red'} text-xs`}>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                    {course.category && <span className="badge-cyan text-xs">{course.category}</span>}
                  </div>
                  <p className="text-white/40 text-sm line-clamp-2 mb-3">{course.description}</p>
                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {course.modules.length} Modules
                    </span>
                    <span className="flex items-center gap-1">
                      <PlayCircle className="w-3 h-3" />
                      {course.modules.reduce((a, m) => a + m._count.videos, 0)} Videos
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      {course.modules.reduce((a, m) => a + m._count.questions, 0)} Questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {course._count.enrollments} Students
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => togglePublish(course)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${course.isPublished
                        ? 'bg-white/5 text-white/50 hover:bg-red-500/20 hover:text-red-300'
                        : 'bg-white/5 text-white/50 hover:bg-green-500/20 hover:text-green-300'}`}
                  >
                    {course.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {course.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                  >
                    Manage <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Module quick view */}
              {course.modules.length > 0 && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  {course.modules.map((m) => (
                    <div key={m.id} className="badge-purple text-xs">
                      M{m.order}: {m._count.videos}v {m._count.questions}q
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { BookOpen, Users, ChevronRight, Plus, Loader2, CheckCircle } from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  category: string
  modules: Array<{ id: string; title: string; order: number }>
  _count: { enrollments: number }
}

interface Enrollment {
  course: { id: string }
}

export default function StudentCoursesPage() {
  const [available, setAvailable] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/student/courses').then((r) => r.json()),
      fetch('/api/student/enrollments').then((r) => r.json()),
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
      setEnrollments([...enrollments, { course: { id: courseId } }])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to enroll')
    } finally {
      setEnrolling(null)
    }
  }

  const enrolledIds = new Set(enrollments.map((e) => e.course.id))

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">
          <span className="gradient-text">Available Courses</span>
        </h1>
        <p className="text-white/40 mt-1">Enroll in courses and start learning</p>
      </div>

      {available.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No courses available yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {available.map((course) => {
            const isEnrolled = enrolledIds.has(course.id)
            return (
              <div key={course.id} className="glass-card-hover p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h2 className="font-display font-semibold text-xl">{course.title}</h2>
                      <span className="badge-cyan text-xs">{course.category}</span>
                      {isEnrolled && <span className="badge-green text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Enrolled</span>}
                    </div>
                    <p className="text-white/50 text-sm mb-4 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-4 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {course.modules.length} Modules
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {course._count.enrollments} Students
                      </span>
                    </div>
                    {/* Module list */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {course.modules.map((m) => (
                        <span key={m.id} className="badge-purple text-xs">
                          M{m.order}: {m.title.slice(0, 20)}{m.title.length > 20 ? '...' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isEnrolled ? (
                      <Link
                        href={`/dashboard/courses/${course.id}`}
                        className="btn-primary flex items-center gap-2 text-sm py-2.5"
                      >
                        Continue <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={enrolling === course.id}
                        className="btn-primary flex items-center gap-2 text-sm py-2.5"
                      >
                        {enrolling === course.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <><Plus className="w-4 h-4" /> Enroll</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

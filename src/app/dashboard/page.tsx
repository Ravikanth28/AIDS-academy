'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Award, TrendingUp, CheckCircle, PlayCircle, ChevronRight, Sparkles, Brain, Loader2
} from 'lucide-react'

interface Enrollment {
  id: string
  enrolledAt: string
  course: {
    id: string
    title: string
    category: string
    modules: Array<{ id: string; title: string; order: number }>
  }
  moduleProgress: Array<{
    moduleId: string
    videoCompleted: boolean
    testPassed: boolean
    testScore: number | null
  }>
}

interface Certificate {
  id: string
  issuedAt: string
  course: { id: string; title: string }
}

export default function DashboardPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/student/enrollments').then((r) => r.json()),
      fetch('/api/student/certificates').then((r) => r.json()),
    ]).then(([me, enr, certs]) => {
      setUser(me)
      setEnrollments(Array.isArray(enr) ? enr : [])
      setCertificates(Array.isArray(certs) ? certs : [])
      setLoading(false)
    })
  }, [])

  const totalModules = enrollments.reduce((a, e) => a + e.course.modules.length, 0)
  const completedModules = enrollments.reduce(
    (a, e) => a + e.moduleProgress.filter((p) => p.testPassed).length,
    0
  )
  const overallProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-white/40 text-sm">Good to see you</span>
        </div>
        <h1 className="font-display text-3xl font-bold">
          Welcome back,{' '}
          <span className="gradient-text">{user?.name || 'Student'} 👋</span>
        </h1>
        <p className="text-white/40 mt-1">Continue your AI & Data Science journey</p>
      </div>

      {/* Overall Progress */}
      {totalModules > 0 && (
        <div className="glass-card gradient-border p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Overall Progress
            </h2>
            <span className="gradient-text font-bold font-display text-xl">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-1000"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40 mt-2">
            <span>{completedModules} modules completed</span>
            <span>{totalModules} total</span>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 text-center">
          <div className="font-display text-2xl font-bold gradient-text">{enrollments.length}</div>
          <div className="text-xs text-white/40 mt-1">Course{enrollments.length !== 1 ? 's' : ''} Enrolled</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="font-display text-2xl font-bold gradient-text">{completedModules}</div>
          <div className="text-xs text-white/40 mt-1">Modules Done</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="font-display text-2xl font-bold gradient-text">{certificates.length}</div>
          <div className="text-xs text-white/40 mt-1">Certificate{certificates.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Active Courses */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">My Courses</h2>
          <Link href="/dashboard/courses" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            View all →
          </Link>
        </div>

        {enrollments.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Brain className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 mb-4">No courses enrolled yet</p>
            <Link href="/dashboard/courses" className="btn-primary inline-flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4" /> Explore Courses
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.slice(0, 3).map((enr) => {
              const modules = enr.course.modules
              const done = enr.moduleProgress.filter((p) => p.testPassed).length
              const total = modules.length
              const progress = total > 0 ? (done / total) * 100 : 0

              // Find next module to work on
              const nextModule = modules.find((m) => {
                const p = enr.moduleProgress.find((mp) => mp.moduleId === m.id)
                return !p?.testPassed
              })

              return (
                <Link
                  key={enr.id}
                  href={`/dashboard/courses/${enr.course.id}`}
                  className="glass-card-hover p-5 group block"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold group-hover:text-purple-300 transition-colors">
                        {enr.course.title}
                      </h3>
                      <span className="badge-cyan text-xs mt-1">{enr.course.category}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-1" />
                  </div>

                  {/* Module dots */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {modules.map((mod) => {
                      const p = enr.moduleProgress.find((mp) => mp.moduleId === mod.id)
                      return (
                        <div
                          key={mod.id}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                            ${p?.testPassed
                              ? 'bg-green-500/20 text-green-300 border border-green-500/20'
                              : p?.videoCompleted
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                              : 'bg-white/5 text-white/30'}`}
                        >
                          {p?.testPassed ? <CheckCircle className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
                          M{mod.order}
                        </div>
                      )
                    })}
                  </div>

                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-white/30 mt-1.5">
                    <span>
                      {nextModule ? `Next: Module ${nextModule.order}` : '🎉 Course Complete!'}
                    </span>
                    <span>{done}/{total} modules</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" /> Certificates
            </h2>
            <Link href="/dashboard/certificates" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {certificates.slice(0, 2).map((cert) => (
              <Link
                key={cert.id}
                href="/dashboard/certificates"
                className="glass-card-hover p-5 border border-amber-500/20 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
                    <Award className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{cert.course.title}</p>
                    <p className="text-xs text-white/40">
                      Issued {new Date(cert.issuedAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

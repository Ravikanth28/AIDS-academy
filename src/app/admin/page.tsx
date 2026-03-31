'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Users, Award, PlayCircle, ChevronRight, TrendingUp, Brain, Sparkles } from 'lucide-react'

interface Stats {
  totalCourses: number
  totalStudents: number
  totalCertificates: number
  totalModules: number
  recentStudents: Array<{ id: string; name: string; phone: string; createdAt: string }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const [coursesRes, studentsRes] = await Promise.all([
        fetch('/api/admin/courses'),
        fetch('/api/admin/students'),
      ])
      const courses = await coursesRes.json()
      const students = await studentsRes.json()

      const totalModules = courses.reduce((acc: number, c: { modules: unknown[] }) => acc + c.modules.length, 0)
      const totalCerts = students.reduce((acc: number, s: { certificates: unknown[] }) => acc + s.certificates.length, 0)

      setStats({
        totalCourses: courses.length,
        totalStudents: students.length,
        totalCertificates: totalCerts,
        totalModules,
        recentStudents: students.slice(0, 5),
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const statCards = stats
    ? [
        { label: 'Total Courses', value: stats.totalCourses, icon: BookOpen, color: 'from-purple-600/30 to-purple-700/10', border: 'border-purple-500/20', text: 'text-purple-300', href: '/admin/courses' },
        { label: 'Modules', value: stats.totalModules, icon: PlayCircle, color: 'from-cyan-600/30 to-cyan-700/10', border: 'border-cyan-500/20', text: 'text-cyan-300', href: '/admin/courses' },
        { label: 'Students', value: stats.totalStudents, icon: Users, color: 'from-violet-600/30 to-violet-700/10', border: 'border-violet-500/20', text: 'text-violet-300', href: '/admin/students' },
        { label: 'Certificates Issued', value: stats.totalCertificates, icon: Award, color: 'from-amber-600/30 to-amber-700/10', border: 'border-amber-500/20', text: 'text-amber-300', href: '/admin/students' },
      ]
    : []

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="badge-purple">Admin Dashboard</span>
        </div>
        <h1 className="font-display text-3xl font-bold">
          Welcome back,{' '}
          <span className="gradient-text">Admin</span>
        </h1>
        <p className="text-white/40 mt-1">Manage your courses, students, and content</p>
      </div>

      {/* Background glow */}
      <div className="fixed top-1/4 right-10 w-64 h-64 bg-purple-700/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-5 shimmer h-28 rounded-2xl" />
            ))
          : statCards.map((stat) => (
              <Link key={stat.label} href={stat.href} className="glass-card-hover p-5 group">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} border ${stat.border} flex items-center justify-center mb-3 ${stat.text} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="font-display text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
              </Link>
            ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/courses/new" className="glass-card-hover p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <div className="font-semibold">Create Course</div>
            <div className="text-sm text-white/40">Add a new course with modules</div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-purple-400 transition-colors" />
        </Link>
        <Link href="/admin/courses" className="glass-card-hover p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <PlayCircle className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <div className="font-semibold">Manage Videos</div>
            <div className="text-sm text-white/40">Upload & organize video links</div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-cyan-400 transition-colors" />
        </Link>
        <Link href="/admin/students" className="glass-card-hover p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 text-violet-300" />
          </div>
          <div>
            <div className="font-semibold">View Students</div>
            <div className="text-sm text-white/40">Track student progress</div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-violet-400 transition-colors" />
        </Link>
      </div>

      {/* Recent Students */}
      {stats && stats.recentStudents.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-lg">Recent Students</h2>
            <Link href="/admin/students" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentStudents.map((s) => (
              <Link
                key={s.id}
                href={`/admin/students/${s.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {s.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.name}</div>
                  <div className="text-xs text-white/40">{s.phone}</div>
                </div>
                <div className="text-xs text-white/30">
                  {new Date(s.createdAt).toLocaleDateString('en-IN')}
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Users, ChevronRight, Award, BookOpen, Search, Loader2, Plus, X, Save, User, Phone, Mail, Key } from 'lucide-react'

interface Student {
  id: string
  name: string
  phone: string
  createdAt: string
  enrollments: Array<{
    course: { id: string; title: string }
    moduleProgress: Array<{ testPassed: boolean }>
  }>
  certificates: Array<{ id: string }>
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [registering, setRegistering] = useState(false)

  // Register form
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState<'STUDENT' | 'ADMIN'>('STUDENT')

  function fetchStudents() {
    fetch('/api/admin/students')
      .then((r) => r.json())
      .then((data) => { setStudents(data); setLoading(false) })
  }

  useEffect(() => { fetchStudents() }, [])

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  )

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!regName.trim()) return toast.error('Name is required')
    if (!/^\d{10}$/.test(regPhone)) return toast.error('Enter a valid 10-digit phone')

    setRegistering(true)
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim() || null,
          password: regPassword.trim() || null,
          role: regRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      toast.success(`${regRole === 'ADMIN' ? 'Admin' : 'Student'} registered!`)
      setShowRegister(false)
      setRegName(''); setRegPhone(''); setRegEmail(''); setRegPassword(''); setRegRole('STUDENT')
      fetchStudents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">
            <span className="gradient-text">Students</span>
          </h1>
          <p className="text-white/40 mt-1">{students.length} registered students</p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5"
        >
          <Plus className="w-4 h-4" /> Register User
        </button>
      </div>

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowRegister(false)}>
          <div className="glass-card gradient-border p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-lg">Register New User</h2>
              <button onClick={() => setShowRegister(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Name *
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="input-field"
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone *
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="input-field"
                  placeholder="10-digit number"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="input-field"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Password
                </label>
                <input
                  type="text"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="input-field"
                  placeholder="Optional password"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Role</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRegRole('STUDENT')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                      regRole === 'STUDENT'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('ADMIN')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                      regRole === 'ADMIN'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={registering}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Register
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          className="input-field pl-11"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">{search ? 'No students match your search' : 'No students yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => {
            const totalProgress = student.enrollments.reduce(
              (acc, e) => acc + e.moduleProgress.filter((p) => p.testPassed).length,
              0
            )
            const totalModules = student.enrollments.reduce(
              (acc, e) => acc + e.moduleProgress.length,
              0
            )
            return (
              <Link
                key={student.id}
                href={`/admin/students/${student.id}`}
                className="glass-card-hover p-5 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {student.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{student.name}</h3>
                    {student.certificates.length > 0 && (
                      <span className="badge-amber flex items-center gap-1 text-xs" style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: 'rgb(252,211,77)' }}>
                        <Award className="w-3 h-3" />
                        {student.certificates.length} cert{student.certificates.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/40">{student.phone}</p>
                  <div className="flex items-center gap-3 text-xs text-white/30 mt-1">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {student.enrollments.length} course{student.enrollments.length !== 1 ? 's' : ''}
                    </span>
                    {totalModules > 0 && (
                      <span>{totalProgress}/{totalModules} modules complete</span>
                    )}
                    <span>Joined {new Date(student.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                {/* Progress bar */}
                {totalModules > 0 && (
                  <div className="hidden md:block w-24">
                    <div className="text-xs text-white/40 mb-1 text-right">
                      {Math.round((totalProgress / totalModules) * 100)}%
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${(totalProgress / totalModules) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition-colors" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, BookOpen, Award, CheckCircle, XCircle, Clock, PlayCircle, Loader2, Save, Key, User, Phone, Mail, Pencil } from 'lucide-react'

interface StudentDetail {
  id: string
  name: string
  phone: string
  email: string
  createdAt: string
  enrollments: Array<{
    id: string
    enrolledAt: string
    course: {
      id: string
      title: string
      modules: Array<{ id: string; title: string; order: number }>
    }
    moduleProgress: Array<{
      moduleId: string
      module: { id: string; title: string; order: number }
      videoCompleted: boolean
      testPassed: boolean
      testScore: number | null
      completedAt: string | null
    }>
  }>
  testAttempts: Array<{
    id: string
    score: number
    passed: boolean
    createdAt: string
    module: { title: string; order: number }
  }>
  certificates: Array<{
    id: string
    certificateNo: string
    issuedAt: string
    course: { id: string; title: string }
  }>
}

export default function StudentDetailPage() {
  const params = useParams()!
  const router = useRouter()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    fetch(`/api/admin/students/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { router.push('/admin/students'); return }
        setStudent(data)
        setEditName(data.name)
        setEditPhone(data.phone)
        setEditEmail(data.email || '')
        setLoading(false)
      })
  }, [params.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim()) return toast.error('Name is required')
    if (!/^\d{10}$/.test(editPhone)) return toast.error('Enter a valid 10-digit phone number')

    setSaving(true)
    try {
      const body: Record<string, string | null> = {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
      }
      if (newPassword.trim()) {
        body.password = newPassword.trim()
      }

      const res = await fetch(`/api/admin/students/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')

      setStudent((prev) => prev ? { ...prev, name: data.name, phone: data.phone, email: data.email } : prev)
      setNewPassword('')
      setEditing(false)
      toast.success('Student updated successfully!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )
  if (!student) return null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/students" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/50" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold">{student.name}</h1>
          <p className="text-white/40 text-sm">{student.phone} • Joined {new Date(student.createdAt).toLocaleDateString('en-IN')}</p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            editing ? 'bg-white/10 text-white' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
          }`}
        >
          <Pencil className="w-4 h-4" />
          {editing ? 'Cancel Edit' : 'Edit Student'}
        </button>
      </div>

      {/* Edit Form */}
      {editing && (
        <form onSubmit={handleSave} className="glass-card gradient-border p-6 mb-6 space-y-4">
          <h2 className="font-display font-semibold text-lg mb-2 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-purple-400" /> Edit Student Details
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Optional"
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" /> New Password
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="input-field"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-6 py-2.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 text-center">
          <div className="font-display text-2xl font-bold gradient-text">{student.enrollments.length}</div>
          <div className="text-xs text-white/40 mt-1">Courses Enrolled</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="font-display text-2xl font-bold gradient-text">
            {student.enrollments.reduce((a, e) => a + e.moduleProgress.filter((p) => p.testPassed).length, 0)}
          </div>
          <div className="text-xs text-white/40 mt-1">Modules Completed</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="font-display text-2xl font-bold gradient-text">{student.certificates.length}</div>
          <div className="text-xs text-white/40 mt-1">Certificates</div>
        </div>
      </div>

      {/* Certificates */}
      {student.certificates.length > 0 && (
        <div className="glass-card p-6 mb-6">
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" /> Certificates Earned
          </h2>
          <div className="space-y-3">
            {student.certificates.map((cert) => (
              <div key={cert.id} className="flex items-center gap-3 p-3 glass-card rounded-xl border border-amber-500/20">
                <Award className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{cert.course.title}</p>
                  <p className="text-xs text-white/40">
                    Cert # {cert.certificateNo.slice(-8).toUpperCase()} •
                    Issued {new Date(cert.issuedAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrollment Details */}
      {student.enrollments.map((enrollment) => {
        const modules = enrollment.course.modules
        return (
          <div key={enrollment.id} className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold">{enrollment.course.title}</h2>
              <span className="text-xs text-white/40">
                Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString('en-IN')}
              </span>
            </div>

            {/* Module Progress */}
            <div className="space-y-3">
              {modules.map((mod) => {
                const progress = enrollment.moduleProgress.find((p) => p.moduleId === mod.id)
                return (
                  <div key={mod.id} className="flex items-center gap-3 p-3 glass-card rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-300 flex-shrink-0">
                      {mod.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{mod.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`flex items-center gap-1 text-xs ${progress?.videoCompleted ? 'text-green-400' : 'text-white/30'}`}>
                          <PlayCircle className="w-3 h-3" />
                          {progress?.videoCompleted ? 'Videos done' : 'Videos pending'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {progress?.testPassed ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-xs text-green-400">{Math.round(progress.testScore || 0)}%</span>
                        </div>
                      ) : progress?.videoCompleted ? (
                        <span className="badge-red text-xs">Test pending</span>
                      ) : (
                        <span className="text-xs text-white/20">Not started</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Test History */}
      {student.testAttempts.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-display font-semibold text-lg mb-4">Test History</h2>
          <div className="space-y-2">
            {student.testAttempts.map((attempt) => (
              <div key={attempt.id} className="flex items-center gap-3 p-3 glass-card rounded-xl">
                {attempt.passed ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">Module {attempt.module.order}: {attempt.module.title}</p>
                  <p className="text-xs text-white/40">
                    {new Date(attempt.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <span className={`text-sm font-bold ${attempt.passed ? 'text-green-400' : 'text-red-400'}`}>
                  {Math.round(attempt.score)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

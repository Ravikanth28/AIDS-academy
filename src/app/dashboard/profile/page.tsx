'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  User, Phone, Mail, Save, Loader2, CheckCircle, BookOpen,
  Trophy, Edit3, Calendar, Shield, Lock, Eye, EyeOff, KeyRound,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Profile {
  id: string
  name: string
  phone: string
  email: string | null
  createdAt: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [certCount, setCertCount] = useState(0)
  const [enrollCount, setEnrollCount] = useState(0)

  // Password change state
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/student/profile').then(r => r.json()),
      fetch('/api/student/dashboard').then(r => r.json()),
    ]).then(([data, dash]) => {
      if (!data.error) {
        setProfile(data); setName(data.name); setPhone(data.phone); setEmail(data.email || '')
      }
      setCertCount(Array.isArray(dash.certificates) ? dash.certificates.length : 0)
      setEnrollCount(Array.isArray(dash.enrollments) ? dash.enrollments.length : 0)
      setLoading(false)
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Name is required')
    if (!/^\d{10}$/.test(phone)) return toast.error('Enter a valid 10-digit phone number')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email')
    setSaving(true)
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile')
      setProfile({ ...profile!, ...data })
      setEditMode(false)
      toast.success('Profile updated!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPwd) return toast.error('Enter your current password')
    if (newPwd.length < 6) return toast.error('New password must be at least 6 characters')
    if (newPwd !== confirmPwd) return toast.error('Passwords do not match')
    setChangingPwd(true)
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email: email || null, currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      toast.success('Password changed successfully!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setChangingPwd(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )

  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'ST'
  const memberSince = profile ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : ''

  return (
    <div className="w-full space-y-6">

      {/* Hero Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 via-dark-200 to-cyan-900/20 p-7"
      >
        <div className="absolute -top-10 -right-10 w-60 h-60 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-44 h-44 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-wrap items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-2xl font-bold font-display shadow-xl shadow-purple-500/20">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-dark" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold mb-0.5">{name || 'Student'}</h1>
            <p className="text-white/40 text-sm flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5" /> Member since {memberSince}
            </p>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                <Shield className="w-3 h-3" /> Student
              </span>
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-300 border border-green-500/20">
                <CheckCircle className="w-3 h-3" /> Verified
              </span>
            </div>
          </div>

          <button onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              editMode ? 'bg-red-500/15 text-red-300 border border-red-500/20' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {editMode ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {[
            { icon: BookOpen, val: enrollCount, label: 'Enrolled', sub: 'courses', color: 'text-purple-400 bg-purple-500/10 border-purple-500/15' },
            { icon: CheckCircle, val: certCount, label: 'Certificates', sub: 'earned', color: 'text-amber-400 bg-amber-500/10 border-amber-500/15' },
            { icon: Trophy, val: certCount, label: 'Achievements', sub: 'unlocked', color: 'text-green-400 bg-green-500/10 border-green-500/15' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className={`flex items-center gap-3 p-3.5 rounded-xl border ${s.color.split(' ').slice(1).join(' ')}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-display font-bold text-xl leading-none">{s.val}</div>
                <div className="text-white/30 text-[10px] mt-0.5">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Personal Information */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-card p-6"
        >
          <h2 className="font-display font-bold text-base mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" />
            {editMode ? 'Edit Information' : 'Personal Information'}
          </h2>

          {editMode ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Full Name <span className="text-red-400">*</span>
                </label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name" className="input-field" required />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium border-r border-white/10 pr-2">+91</div>
                  <input type="tel" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number" className="input-field pl-14" required />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email <span className="text-white/25">(optional)</span>
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" className="input-field" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditMode(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-1">
              {[
                { icon: User, label: 'Full Name', value: name || '—' },
                { icon: Phone, label: 'Phone', value: phone ? `+91 ${phone}` : '—' },
                { icon: Mail, label: 'Email', value: email || 'Not set' },
              ].map(field => (
                <div key={field.label} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                    <field.icon className="w-4 h-4 text-white/30" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-white/30 mb-0.5">{field.label}</div>
                    <div className={`text-sm font-medium ${!field.value || field.value === '—' || field.value === 'Not set' ? 'text-white/20 italic text-xs' : ''}`}>
                      {field.value}
                    </div>
                  </div>
                  {field.label === 'Email' && !email && (
                    <button onClick={() => setEditMode(true)} className="text-xs text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 rounded-lg hover:bg-purple-500/10">+ Add</button>
                  )}
                </div>
              ))}

              <div className="pt-3">
                <button onClick={() => setEditMode(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300 hover:bg-purple-500/20 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="font-display font-bold text-base mb-5 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            Change Password
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  placeholder="Enter current password"
                  className="input-field pr-10"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="input-field pr-10"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {newPwd.length > 0 && (
                <div className="mt-1.5">
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${
                      newPwd.length < 6 ? 'w-1/4 bg-red-500' :
                      newPwd.length < 10 ? 'w-2/4 bg-amber-500' :
                      'w-full bg-green-500'
                    }`} />
                  </div>
                  <p className={`text-[10px] mt-0.5 ${
                    newPwd.length < 6 ? 'text-red-400' : newPwd.length < 10 ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {newPwd.length < 6 ? 'Too short' : newPwd.length < 10 ? 'Fair' : 'Strong password'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="Repeat new password"
                  className={`input-field pr-10 ${confirmPwd && confirmPwd !== newPwd ? 'border-red-500/40' : confirmPwd && confirmPwd === newPwd ? 'border-green-500/40' : ''}`}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPwd && confirmPwd !== newPwd && (
                <p className="text-[10px] text-red-400 mt-1">Passwords do not match</p>
              )}
              {confirmPwd && confirmPwd === newPwd && newPwd.length >= 6 && (
                <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Passwords match</p>
              )}
            </div>

            <button type="submit" disabled={changingPwd || !currentPwd || !newPwd || newPwd !== confirmPwd || newPwd.length < 6}
              className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 mt-1"
            >
              {changingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {changingPwd ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Account status bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="flex items-center gap-4 p-4 rounded-2xl bg-green-500/5 border border-green-500/15"
      >
        <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-300">Account Verified</p>
          <p className="text-xs text-white/30">Your account is active and in good standing</p>
        </div>
      </motion.div>
    </div>
  )
}

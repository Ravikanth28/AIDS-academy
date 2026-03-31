'use client'

import { useEffect, useState } from 'react'
import { User, Phone, Mail, Save, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
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

  useEffect(() => {
    fetch('/api/student/profile')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setProfile(data)
          setName(data.name)
          setPhone(data.phone)
          setEmail(data.email || '')
        }
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
      toast.success('Profile updated successfully!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/50" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold">
            <span className="gradient-text">My Profile</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">Update your personal information</p>
        </div>
      </div>

      {/* Avatar */}
      <div className="glass-card p-6 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {name ? name[0].toUpperCase() : 'S'}
        </div>
        <div>
          <h2 className="font-semibold text-lg">{name || 'Student'}</h2>
          <p className="text-white/40 text-sm">
            Member since {profile ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : ''}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="glass-card p-6 space-y-5">
        <div>
          <label className="text-sm text-white/60 mb-2 block flex items-center gap-2">
            <User className="w-4 h-4" /> Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="text-sm text-white/60 mb-2 block flex items-center gap-2">
            <Phone className="w-4 h-4" /> Phone Number
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">+91</div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className="input-field pl-14"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-white/60 mb-2 block flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com (optional)"
            className="input-field"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  )
}

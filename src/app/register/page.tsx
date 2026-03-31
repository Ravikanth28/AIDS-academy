'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Brain, Phone, User, ArrowRight, Zap, Loader2 } from 'lucide-react'

type Step = 'details' | 'otp'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState('')

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      return toast.error('Please fill all fields')
    }
    if (!/^\d{10}$/.test(form.phone)) {
      return toast.error('Enter a valid 10-digit phone number')
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')
      toast.success('OTP sent successfully!')
      if (data.demoOtp) setDemoOtp(data.demoOtp)
      setStep('otp')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otp || otp.length < 4) return toast.error('Enter the OTP')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, otp, action: 'register', name: form.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'OTP verification failed')
      toast.success('Account created! Welcome 🎉')
      router.push(data.role === 'ADMIN' ? '/admin' : '/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-dark flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-purple-700/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-cyan-700/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center mx-auto mb-4 glow-purple">
            <Brain className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold gradient-text">AI·DS Academy</h1>
          <p className="text-white/40 text-sm mt-1">Create your account</p>
        </div>

        <div className="glass-card gradient-border p-8">
          {/* Steps indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'details' ? 'text-purple-400' : 'text-white/30'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${step === 'details' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/30'}`}>
                1
              </div>
              Your Details
            </div>
            <div className="flex-1 h-px bg-white/10" />
            <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'otp' ? 'text-purple-400' : 'text-white/30'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${step === 'otp' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/30'}`}>
                2
              </div>
              Verify OTP
            </div>
          </div>

          {step === 'details' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Phone Number</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">+91</div>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="input-field pl-14"
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-2">
                <div className="badge-purple mx-auto w-fit mb-3">
                  <Phone className="w-3 h-3 mr-1.5" />
                  OTP sent to +91 {form.phone}
                </div>
                {demoOtp && (
                  <div className="glass-card border border-amber-500/30 bg-amber-500/10 p-3 rounded-xl text-sm">
                    <p className="text-amber-300/70 text-xs mb-1">Demo Mode — Your OTP:</p>
                    <p className="font-mono font-bold text-amber-300 text-xl tracking-widest">{demoOtp}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Enter OTP</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center text-2xl tracking-widest font-mono"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                  <Zap className="w-4 h-4" /> Verify & Create Account
                </>}
              </button>
              <button type="button" onClick={() => setStep('details')} className="btn-secondary w-full text-sm py-2.5">
                Change Details
              </button>
            </form>
          )}

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
        <p className="text-center text-white/20 text-xs mt-4">
          Admin phone: 6383749354 — OTP: 123456
        </p>
      </div>
    </main>
  )
}

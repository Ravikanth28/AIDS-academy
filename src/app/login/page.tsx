'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Brain, Phone, ArrowRight, Zap, Loader2, Sparkles } from 'lucide-react'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState('')

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{10}$/.test(phone)) return toast.error('Enter a valid 10-digit phone number')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')
      toast.success('OTP sent!')
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
        body: JSON.stringify({ phone, otp, action: 'login' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'OTP verification failed')
      toast.success(`Welcome back, ${data.name}!`)
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
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-cyan-700/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-700/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center mx-auto mb-4 glow-purple hover:scale-105 transition-transform">
              <Brain className="w-9 h-9 text-white" />
            </div>
          </Link>
          <h1 className="font-display text-2xl font-bold gradient-text">AI·DS Academy</h1>
          <p className="text-white/40 text-sm mt-1">Sign in to continue learning</p>
        </div>

        <div className="glass-card gradient-border p-8">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <p className="text-white/50 text-sm">Login with your phone number via OTP</p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Phone Number</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">+91</div>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="input-field pl-14 text-lg tracking-wide"
                    autoFocus
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                  <Phone className="w-4 h-4" /> Send OTP <ArrowRight className="w-4 h-4" />
                </>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-2">
                <div className="badge-purple mx-auto w-fit mb-3">
                  <Phone className="w-3 h-3 mr-1.5" />
                  OTP sent to +91 {phone}
                </div>
                {demoOtp && (
                  <div className="glass-card border border-amber-500/30 bg-amber-500/10 p-3 rounded-xl text-sm">
                    <p className="text-amber-300/70 text-xs mb-1">Demo Mode — Your OTP:</p>
                    <p className="font-mono font-bold text-amber-300 text-2xl tracking-widest">{demoOtp}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Enter OTP</label>
                <input
                  type="text"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center text-3xl tracking-widest font-mono h-16"
                  autoFocus
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                  <Zap className="w-4 h-4" /> Verify OTP & Sign In
                </>}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setDemoOtp('') }}
                className="btn-secondary w-full text-sm py-2.5"
              >
                Change Number
              </button>
            </form>
          )}

          <p className="text-center text-white/40 text-sm mt-6">
            New to AI·DS Academy?{' '}
            <Link href="/register" className="text-purple-400 hover:text-purple-300 transition-colors">
              Register Now
            </Link>
          </p>
        </div>

        <div className="glass-card mt-4 p-4 border border-amber-500/20 bg-amber-500/5">
          <p className="text-amber-300/70 text-xs text-center font-medium mb-2">Demo Accounts</p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-white/40 text-xs">Admin</p>
              <p className="text-white/70 text-sm font-mono">6383749354</p>
            </div>
            <div>
              <p className="text-white/40 text-xs">Student</p>
              <p className="text-white/70 text-sm font-mono">6374217463</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

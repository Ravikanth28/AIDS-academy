'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Phone, ArrowRight, Zap, Loader2, Sparkles, Mail, Lock, Eye, EyeOff, GraduationCap, BookOpen, Award, Star } from 'lucide-react'

type Step = 'phone' | 'otp'
type LoginMode = 'otp' | 'email'

/* ── Glowing colour blob ── */
function Blob({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-[100px] pointer-events-none animate-pulse ${className}`} />
}

/* ── Floating particles ── */
function FloatingDots() {
  const dots = Array.from({ length: 30 }, (_, i) => i)
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${i % 3 === 0 ? 'w-1.5 h-1.5 bg-purple-400' : i % 3 === 1 ? 'w-1 h-1 bg-cyan-400' : 'w-0.5 h-0.5 bg-violet-300'}`}
          style={{ left: `${(i * 13 + 5) % 95}%`, top: `${(i * 17 + 8) % 90}%` }}
          animate={{ y: [0, -30, 0], opacity: [0.15, 0.7, 0.15], scale: [1, 1.8, 1] }}
          transition={{ duration: 3 + (i % 5), delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ── Orbiting ring icons ── */
const orbitItems = [
  { icon: GraduationCap, delay: 0 },
  { icon: BookOpen, delay: 1.5 },
  { icon: Award, delay: 3 },
  { icon: Star, delay: 4.5 },
]

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('otp')
  const [mounted, setMounted] = useState(false)

  // OTP mode state
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState('')

  // Email mode state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return toast.error('Enter your email and password')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      toast.success(`Welcome back, ${data.name}!`)
      router.push(data.role === 'ADMIN' ? '/admin' : '/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(newMode: LoginMode) {
    setMode(newMode)
    setStep('phone')
    setOtp('')
    setDemoOtp('')
    setPhone('')
    setEmail('')
    setPassword('')
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 10%, #1a0533 0%, #0a0015 40%, #000a18 70%, #050508 100%)' }}
    >

      {/* ── Rich Animated Background ── */}
      <div className="fixed inset-0 pointer-events-none">

        {/* Grid pattern — visible purple grid */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(139,92,246,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.12) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Dot accent at intersections */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(167,139,250,0.25) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Vivid glowing blobs */}
        <Blob className="w-[600px] h-[600px] bg-purple-600/40 -top-40 -left-40" />
        <Blob className="w-[450px] h-[450px] bg-cyan-500/25 top-1/3 -right-32" />
        <Blob className="w-[500px] h-[500px] bg-violet-700/35 -bottom-32 left-1/3" />
        <Blob className="w-[300px] h-[300px] bg-indigo-400/20 bottom-20 right-20" />
        <Blob className="w-[250px] h-[250px] bg-fuchsia-600/20 top-10 right-1/3" />

        {/* Radial vignette overlay */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgba(5,5,8,0.7) 100%)' }} />

        {/* Floating coloured particles */}
        {mounted && <FloatingDots />}

        {/* Horizontal scan line */}
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent"
          animate={{ top: ['5%', '95%', '5%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
        {/* Second scan — cyan */}
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
          animate={{ top: ['95%', '5%', '95%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* ── Orbiting icons around card (desktop) ── */}
      {mounted && (
        <div className="hidden lg:block absolute w-[520px] h-[520px] pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          {orbitItems.map(({ icon: Icon, delay }, idx) => (
            <motion.div
              key={idx}
              className="absolute w-10 h-10 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center"
              style={{ left: '50%', top: '50%', marginLeft: -20, marginTop: -20 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 14, delay, repeat: Infinity, ease: 'linear' }}
              initial={{ rotate: idx * 90 }}
            >
              <motion.div
                style={{ transform: `translateX(220px)` }}
                animate={{ rotate: -360 }}
                transition={{ duration: 14, delay, repeat: Infinity, ease: 'linear' }}
              >
                <Icon className="w-4 h-4 text-purple-400/60" />
              </motion.div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative z-10 w-full max-w-md">

        {/* ── Logo ── */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Link href="/">
            <motion.div
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 via-violet-600 to-cyan-500 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-purple-500/40"
              whileHover={{ scale: 1.08, rotate: 3 }}
              whileTap={{ scale: 0.95 }}
              animate={{ boxShadow: ['0 0 30px rgba(168,85,247,0.3)', '0 0 60px rgba(139,92,246,0.5)', '0 0 30px rgba(168,85,247,0.3)'] }}
              transition={{ boxShadow: { duration: 2.5, repeat: Infinity }, hover: { duration: 0.2 } }}
            >
              <Brain className="w-10 h-10 text-white" />
            </motion.div>
          </Link>
          <motion.h1
            className="font-display text-3xl font-bold gradient-text"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          >
            AI·DS Academy
          </motion.h1>
          <motion.p
            className="text-white/40 text-sm mt-1.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          >
            Sign in to continue learning
          </motion.p>
        </motion.div>

        {/* ── Card ── */}
        <motion.div
          className="relative rounded-3xl border border-white/10 bg-dark-200/80 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        >
          {/* Glowing top edge */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          <div className="p-8">
            {/* Mode Toggle Tabs */}
            <div className="flex rounded-2xl overflow-hidden border border-white/8 mb-6 p-1 bg-white/3">
              {(['otp', 'email'] as LoginMode[]).map((m) => (
                <motion.button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    mode === m
                      ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/30'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                  whileTap={{ scale: 0.97 }}
                >
                  {m === 'otp' ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  {m === 'otp' ? 'Phone OTP' : 'Email & Password'}
                </motion.button>
              ))}
            </div>

            {/* ── OTP Login ── */}
            <AnimatePresence mode="wait">
              {mode === 'otp' && (
                <motion.div key="otp" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <p className="text-white/50 text-sm">Login with your phone number via OTP</p>
                  </div>

                  <AnimatePresence mode="wait">
                    {step === 'phone' ? (
                      <motion.form key="phone" onSubmit={handleRequestOtp} className="space-y-5"
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                        <div>
                          <label className="text-sm text-white/60 mb-2 block">Phone Number</label>
                          <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">+91</div>
                            <input
                              type="tel"
                              placeholder="10-digit mobile number"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              className="input-field pl-14 text-lg tracking-wide focus:ring-2 focus:ring-purple-500/30 transition-all"
                              autoFocus
                              required
                            />
                            <div className="absolute inset-0 rounded-xl ring-2 ring-purple-500/0 group-focus-within:ring-purple-500/20 pointer-events-none transition-all" />
                          </div>
                        </div>
                        <motion.button type="submit" disabled={loading}
                          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base font-semibold shadow-lg shadow-purple-500/25"
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                            <Phone className="w-4 h-4" /> Send OTP <ArrowRight className="w-4 h-4" />
                          </>}
                        </motion.button>
                      </motion.form>
                    ) : (
                      <motion.form key="otp-step" onSubmit={handleVerifyOtp} className="space-y-5"
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                        <div className="text-center mb-2">
                          <div className="badge-purple mx-auto w-fit mb-3">
                            <Phone className="w-3 h-3 mr-1.5" />
                            OTP sent to +91 {phone}
                          </div>
                          {demoOtp && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                              className="border border-amber-500/30 bg-amber-500/10 p-3 rounded-2xl text-sm">
                              <p className="text-amber-300/70 text-xs mb-1">Demo Mode — Your OTP:</p>
                              <p className="font-mono font-bold text-amber-300 text-2xl tracking-widest">{demoOtp}</p>
                            </motion.div>
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
                            autoFocus required
                          />
                        </div>
                        <motion.button type="submit" disabled={loading}
                          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 font-semibold shadow-lg shadow-purple-500/25"
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-4 h-4" /> Verify OTP & Sign In</>}
                        </motion.button>
                        <button type="button" onClick={() => { setStep('phone'); setOtp(''); setDemoOtp('') }}
                          className="btn-secondary w-full text-sm py-2.5">
                          Change Number
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* ── Email Login ── */}
              {mode === 'email' && (
                <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <p className="text-white/50 text-sm">Login with your email and password</p>
                  </div>
                  <form onSubmit={handleEmailLogin} className="space-y-5">
                    <div>
                      <label className="text-sm text-white/60 mb-2 block">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input type="email" placeholder="you@example.com" value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="input-field pl-10" autoFocus required />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-white/60 mb-2 block">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="input-field pl-10 pr-10" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <motion.button type="submit" disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 font-semibold shadow-lg shadow-purple-500/25"
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Sign In</>}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-center text-white/40 text-sm mt-6">
              New to AI·DS Academy?{' '}
              <Link href="/register" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
                Register Now
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer hints */}
        <motion.div
          className="flex items-center justify-center gap-6 mt-6 text-xs text-white/20"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        >
          <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-400/50" /> AI-Powered</span>
          <span className="text-white/10">•</span>
          <span className="flex items-center gap-1.5"><Award className="w-3 h-3 text-cyan-400/50" /> Certified Courses</span>
          <span className="text-white/10">•</span>
          <span className="flex items-center gap-1.5"><BookOpen className="w-3 h-3 text-purple-400/50" /> Learn & Grow</span>
        </motion.div>
      </div>
    </main>
  )
}

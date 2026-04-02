'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Brain, ArrowRight, Loader2, Sparkles, Mail, Lock, Eye, EyeOff, GraduationCap, BookOpen, Award, Star, Zap } from 'lucide-react'

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
  const [mounted, setMounted] = useState(false)

  // Email mode state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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

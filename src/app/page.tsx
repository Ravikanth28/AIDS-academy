'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Brain,
  Code2,
  Database,
  TrendingUp,
  Award,
  Users,
  PlayCircle,
  ChevronRight,
  Sparkles,
  Zap,
  Shield,
  BookOpen,
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'AI-Powered Learning',
      desc: 'Cerebras AI generates module assessments and insights tailored to your progress.',
      color: 'from-purple-500/20 to-purple-600/10',
      border: 'border-purple-500/20',
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: 'Module-by-Module',
      desc: 'Structured learning path with video lectures organized by topic and module.',
      color: 'from-cyan-500/20 to-cyan-600/10',
      border: 'border-cyan-500/20',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'MCQ Assessments',
      desc: 'Shuffled questions per module with instant feedback and passing criteria.',
      color: 'from-violet-500/20 to-violet-600/10',
      border: 'border-violet-500/20',
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: 'Certificates',
      desc: 'Earn verifiable certificates upon completing all modules successfully.',
      color: 'from-amber-500/20 to-amber-600/10',
      border: 'border-amber-500/20',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Progress Tracking',
      desc: 'Track your learning progress across all modules from your dashboard.',
      color: 'from-green-500/20 to-green-600/10',
      border: 'border-green-500/20',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'OTP-Secured Login',
      desc: 'Secure authentication via mobile OTP — no passwords to remember.',
      color: 'from-pink-500/20 to-pink-600/10',
      border: 'border-pink-500/20',
    },
  ]

  const stats = [
    { value: '3+', label: 'Expert Modules' },
    { value: '9+', label: 'Video Lectures' },
    { value: '24+', label: 'MCQ Questions' },
    { value: '100%', label: 'AI-Assisted' },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-dark">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-700/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-700/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[150px]" />
        {/* Floating particles */}
        {mounted && Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="particle absolute rounded-full bg-purple-400/30"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              '--duration': `${Math.random() * 6 + 3}s`,
              '--delay': `${Math.random() * 3}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl gradient-text">AI·DS Academy</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary text-sm">
            Sign In
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`relative z-10 pt-16 pb-24 px-6 text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="badge-purple mx-auto mb-6 w-fit">
            <Sparkles className="w-3 h-3 mr-1.5 animate-pulse" />
            Powered by Cerebras AI
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6">
            Master{' '}
            <span className="gradient-text">AI & Data Science</span>
            <br />
            at Your Pace
          </h1>

          <p className="text-base sm:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Learn through structured video modules, test your knowledge with AI-generated MCQs,
            and earn certificates — all on one intelligent platform.
          </p>

          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            <Link href="/register" className="btn-primary flex items-center gap-2 text-sm sm:text-base px-5 sm:px-8 py-3 sm:py-4">
              <PlayCircle className="w-5 h-5" />
              Start Learning Free
            </Link>
            <Link href="/login" className="btn-secondary flex items-center gap-2 text-sm sm:text-base px-5 sm:px-8 py-3 sm:py-4">
              Sign In
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card p-5 text-center">
              <div className="font-display text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="text-sm text-white/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Neon divider */}
      <div className="neon-line max-w-5xl mx-auto" />

      {/* Features Grid */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
          <h2 className="font-display text-2xl sm:text-4xl font-bold mb-4">
              Everything You Need to{' '}
              <span className="gradient-text">Succeed</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              A complete learning ecosystem built for the next generation of AI professionals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className={`glass-card-hover p-6 group cursor-default`}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} border ${f.border} flex items-center justify-center mb-4 text-purple-300 group-hover:scale-110 transition-transform`}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Path Visual */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-2xl sm:text-4xl font-bold mb-4">
            Your Learning{' '}
            <span className="gradient-text">Journey</span>
          </h2>
          <p className="text-white/50 mb-14">
            Every step is unlocked as you prove your mastery
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {[
              { icon: <BookOpen className="w-5 h-5" />, label: 'Watch Videos', color: 'border-purple-500/40 bg-purple-500/10' },
              { icon: <Code2 className="w-5 h-5" />, label: 'Take Module Test', color: 'border-cyan-500/40 bg-cyan-500/10' },
              { icon: <Zap className="w-5 h-5" />, label: 'Unlock Next Module', color: 'border-violet-500/40 bg-violet-500/10' },
              { icon: <Award className="w-5 h-5" />, label: 'Get Certificate', color: 'border-amber-500/40 bg-amber-500/10' },
            ].map((step, index) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`glass-card border ${step.color} px-6 py-4 flex items-center gap-3 min-w-[160px]`}>
                  <span className="text-white/60">{step.icon}</span>
                  <span className="font-medium text-sm">{step.label}</span>
                </div>
                {index < 3 && (
                  <ChevronRight className="w-5 h-5 text-white/20 hidden md:block flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card gradient-border p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-cyan-600/30 border border-purple-500/30 flex items-center justify-center mx-auto mb-6">
              <Brain className="w-8 h-8 text-purple-300" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
              Ready to Begin Your AI Journey?
            </h2>
            <p className="text-white/50 mb-8 text-lg">
              Join the AI·DS Academy — where intelligent learning meets modern technology.
            </p>
            <Link href="/register" className="btn-primary inline-flex items-center gap-2 text-sm sm:text-base px-6 sm:px-10 py-3 sm:py-4">
              <Sparkles className="w-5 h-5" />
              Register Now — It's Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-sm gradient-text">AI·DS Academy</span>
          </div>
          <p className="text-white/30 text-sm">
            © 2026 AI·DS Academy. All rights reserved.
          </p>
          <p className="text-white/30 text-xs">
            AI Department Learning Platform
          </p>
        </div>
      </footer>
    </main>
  )
}

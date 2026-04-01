'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, Loader2, Trophy, Star, Calendar, Hash } from 'lucide-react'
import CertificateCard from '@/components/student/CertificateCard'

interface Certificate {
  id: string
  certificateNo: string
  issuedAt: string
  course: {
    title: string
    description: string
    category: string
  }
  user: {
    name: string
    phone: string
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI & Data Science': 'from-purple-600 to-cyan-500',
  'Web Development': 'from-orange-500 to-yellow-400',
  'Database & SQL': 'from-blue-600 to-teal-400',
  'Cybersecurity': 'from-red-600 to-orange-400',
}

function getCertGradient(cat: string) {
  return CATEGORY_COLORS[cat] || 'from-pink-500 to-purple-600'
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/student/certificates')
      .then(r => r.json())
      .then(data => {
        setCerts(Array.isArray(data) ? data : data.certificates || [])
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )

  return (
    <div>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-900/30 via-dark-200 to-yellow-900/10 p-7 mb-8"
      >
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-yellow-500/8 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400/70 text-sm font-medium">Hall of Fame</span>
            </div>
            <h1 className="font-display text-3xl font-bold mb-1">My Certificates</h1>
            <p className="text-white/40 text-sm">Proof of your dedication and hard work</p>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-600/20 border border-amber-500/20 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold text-amber-300">{certs.length}</span>
              <span className="text-amber-400/50 text-[10px]">earned</span>
            </div>
          </div>
        </div>
      </motion.div>

      {certs.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-20 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-10 h-10 text-amber-400/40" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">No certificates yet</h3>
          <p className="text-white/30 text-sm">Complete all modules in a course to earn your first certificate</p>
        </motion.div>
      ) : (
        <>
          {/* Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
            {certs.map((cert, i) => {
              const isOpen = selected === cert.id
              const grad = getCertGradient(cert.course.category)
              return (
                <motion.div key={cert.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <button
                    onClick={() => setSelected(isOpen ? null : cert.id)}
                    className={`w-full text-left rounded-2xl border overflow-hidden transition-all duration-300 group
                      ${isOpen
                        ? 'border-amber-500/50 shadow-xl shadow-amber-500/15 scale-[1.02]'
                        : 'border-white/8 bg-white/3 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/8 hover:scale-[1.01]'
                      }`}
                  >
                    {/* Gradient top bar */}
                    <div className={`h-2.5 w-full bg-gradient-to-r ${grad}`} />

                    {/* Banner area */}
                    <div className={`relative h-28 bg-gradient-to-br ${grad} overflow-hidden`} style={{ opacity: 0.18 }} />
                    <div className={`-mt-28 relative h-28 bg-gradient-to-br from-black/60 to-black/20 flex items-center justify-center`}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      {/* Big star badge */}
                      <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-2xl p-0.5`}>
                        <div className="w-full h-full rounded-[14px] bg-black/40 flex items-center justify-center">
                          <Star className="w-7 h-7 text-amber-200" />
                        </div>
                      </div>
                      {/* Earned badge */}
                      <div className="absolute top-2.5 right-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/25 font-medium backdrop-blur-sm">✓ Earned</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className={`p-4 ${isOpen ? 'bg-amber-500/5' : 'bg-white/2'} transition-colors`}>
                      <h3 className="font-display font-bold text-sm leading-tight mb-1 group-hover:text-amber-200 transition-colors line-clamp-2">
                        {cert.course.title}
                      </h3>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300/70 mb-3`}>
                        {cert.course.category}
                      </span>

                      <div className="space-y-1.5 text-xs text-white/40">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Issued</span>
                          <span className="text-white/60">{new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Cert No.</span>
                          <span className="text-amber-400/60 font-mono">{cert.certificateNo.slice(0, 10)}…</span>
                        </div>
                      </div>

                      <div className={`mt-3 w-full py-1.5 rounded-xl text-xs font-medium text-center transition-all ${
                        isOpen
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-white/5 text-white/30 group-hover:bg-amber-500/15 group-hover:text-amber-300'
                      }`}>
                        {isOpen ? '▲ Hide Certificate' : '▼ View & Download'}
                      </div>
                    </div>
                  </button>
                </motion.div>
              )
            })}
          </div>

          {/* Expanded certificate view (below grid) */}
          <AnimatePresence>
            {selected && (() => {
              const cert = certs.find(c => c.id === selected)!
              return (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="overflow-hidden"
                >
                  <CertificateCard
                    studentName={cert.user.name}
                    courseName={cert.course.title}
                    courseDescription={cert.course.description}
                    issuedAt={cert.issuedAt}
                    certificateNo={cert.certificateNo}
                  />
                </motion.div>
              )
            })()}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

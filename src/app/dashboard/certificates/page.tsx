'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Trophy, Calendar, Hash, Eye, Download, CheckCircle, Clock, XCircle, Linkedin } from 'lucide-react'
import CertificateCard from '@/components/student/CertificateCard'
import { getCourseThumbnailUrl } from '@/lib/utils'

interface Certificate {
  id: string
  certificateNo: string
  status: 'PENDING' | 'VERIFIED' | 'REVOKED'
  revokedReason: string | null
  issuedAt: string
  course: {
    title: string
    description: string
    category: string
    thumbnail?: string
  }
  user: {
    name: string
    phone: string
  }
}

const CATEGORY_PRESETS: Record<string, { gradient: string; bg: string; text: string; icon: string }> = {
  'AI & Data Science': { gradient: 'from-purple-600 via-violet-600 to-cyan-500', bg: 'bg-purple-500/10', text: 'text-purple-300', icon: '🤖' },
  'Web Development': { gradient: 'from-orange-500 via-pink-500 to-rose-500', bg: 'bg-orange-500/10', text: 'text-orange-300', icon: '🌐' },
  'Database & SQL': { gradient: 'from-blue-600 via-cyan-500 to-teal-400', bg: 'bg-blue-500/10', text: 'text-blue-300', icon: '🗄️' },
  'Cybersecurity': { gradient: 'from-red-600 via-orange-500 to-amber-400', bg: 'bg-red-500/10', text: 'text-red-300', icon: '🔒' },
  'Cloud Computing': { gradient: 'from-sky-500 via-blue-400 to-indigo-500', bg: 'bg-sky-500/10', text: 'text-sky-300', icon: '☁️' },
  'Mobile Development': { gradient: 'from-green-500 via-emerald-400 to-teal-400', bg: 'bg-green-500/10', text: 'text-green-300', icon: '📱' },
}

const DYNAMIC_POOL = [
  { gradient: 'from-pink-500 via-fuchsia-500 to-purple-600', bg: 'bg-pink-500/10', text: 'text-pink-300', icon: '✨' },
  { gradient: 'from-teal-500 via-cyan-400 to-sky-500', bg: 'bg-teal-500/10', text: 'text-teal-300', icon: '🎯' },
  { gradient: 'from-amber-500 via-orange-400 to-yellow-400', bg: 'bg-amber-500/10', text: 'text-amber-300', icon: '⚡' },
  { gradient: 'from-indigo-500 via-blue-500 to-cyan-400', bg: 'bg-indigo-500/10', text: 'text-indigo-300', icon: '🔷' },
]

function strHash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return h }
function getCat(cat: string) { return CATEGORY_PRESETS[cat] ?? DYNAMIC_POOL[strHash(cat) % DYNAMIC_POOL.length] }

function getLinkedInShareUrl(cert: Certificate) {
  const issueDate = new Date(cert.issuedAt)
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: cert.course.title,
    organizationName: 'AI·DS Academy',
    issueYear: String(issueDate.getFullYear()),
    issueMonth: String(issueDate.getMonth() + 1),
    certId: cert.certificateNo,
    certUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${cert.certificateNo}`,
  })
  return `https://www.linkedin.com/profile/add?${params.toString()}`
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [pendingDownload, setPendingDownload] = useState<string | null>(null)

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

  const verifiedCount = certs.filter(c => c.status === 'VERIFIED').length

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
            <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">My Certificates</h1>
            <p className="text-white/40 text-sm">Proof of your dedication and hard work</p>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-600/20 border border-amber-500/20 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold text-amber-300">{verifiedCount}</span>
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
              const canAct = cert.status === 'VERIFIED'
              const cat = getCat(cert.course.category)
              return (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`relative rounded-2xl border overflow-hidden transition-all duration-300
                    ${isOpen
                      ? 'border-amber-500/50 shadow-xl shadow-amber-500/15'
                      : canAct
                      ? 'border-amber-500/30 bg-amber-500/3 shadow-lg shadow-amber-500/8'
                      : 'border-white/8 bg-white/3'
                    }`}
                >
                  {/* Gradient top bar */}
                  <div className={`h-2.5 w-full bg-gradient-to-r ${cat.gradient}`} />

                  {/* Thumbnail / banner */}
                  <div className="relative h-36 overflow-hidden">
                    {getCourseThumbnailUrl(cert.course.thumbnail) ? (
                      <img src={getCourseThumbnailUrl(cert.course.thumbnail)!} alt={cert.course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${cat.gradient} opacity-20`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Category badge */}
                    <div className="absolute bottom-2.5 left-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cat.bg} ${cat.text} backdrop-blur-sm border border-white/10`}>
                        <span>{cat.icon}</span> {cert.course.category}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="absolute top-2.5 right-3">
                      {cert.status === 'VERIFIED' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/25 font-medium backdrop-blur-sm flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {cert.status === 'PENDING' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/25 font-medium backdrop-blur-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                      {cert.status === 'REVOKED' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/25 font-medium backdrop-blur-sm flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Revoked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-display font-bold text-sm leading-tight mb-1 line-clamp-2">{cert.course.title}</h3>
                    <p className="text-white/40 text-xs line-clamp-2 mb-3 leading-relaxed">{cert.course.description}</p>

                    {/* Info rows */}
                    <div className="space-y-1.5 text-xs text-white/40 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Issued</span>
                        <span className="text-white/60">{new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Cert No.</span>
                        <span className="text-amber-400/60 font-mono">{cert.certificateNo.slice(0, 10)}…</span>
                      </div>
                    </div>

                    {/* Revoked reason */}
                    {cert.status === 'REVOKED' && cert.revokedReason && (
                      <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                        <p className="text-xs text-red-300/70"><span className="font-medium">Reason:</span> {cert.revokedReason}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => canAct && setSelected(isOpen ? null : cert.id)}
                          disabled={!canAct}
                          title={!canAct ? 'Available after admin verification' : undefined}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all
                            ${canAct
                              ? `bg-gradient-to-r ${cat.gradient} text-white hover:opacity-90`
                              : 'bg-white/5 text-white/20 cursor-not-allowed'
                            }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isOpen ? 'Hide' : 'View'}
                        </button>

                        <button
                          onClick={() => {
                            if (!canAct) return
                            setSelected(cert.id)
                            setPendingDownload(cert.id)
                          }}
                          disabled={!canAct}
                          title={!canAct ? 'Available after admin verification' : undefined}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all
                            ${canAct
                              ? 'bg-white/8 border border-white/15 text-white/80 hover:bg-white/15 hover:text-white'
                              : 'bg-white/5 text-white/20 cursor-not-allowed'
                            }`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                      </div>

                      {/* LinkedIn share — only for verified certs */}
                      {canAct && (
                        <a
                          href={getLinkedInShareUrl(cert)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-[#0A66C2] hover:bg-[#004182] text-white transition-all shadow-md shadow-[#0A66C2]/25 hover:shadow-[#0A66C2]/40"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          Add to LinkedIn Profile
                        </a>
                      )}
                    </div>

                    {!canAct && cert.status === 'PENDING' && (
                      <p className="mt-2 text-center text-[10px] text-amber-300/40">Awaiting admin verification to unlock</p>
                    )}
                  </div>
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
                  key={selected}
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
                    status={cert.status}
                    revokedReason={cert.revokedReason}
                    autoDownload={pendingDownload === cert.id}
                    onDownloadDone={() => setPendingDownload(null)}
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



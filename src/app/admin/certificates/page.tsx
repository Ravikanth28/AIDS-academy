'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, CheckCircle2, XCircle, Clock, Loader2, Search,
  ExternalLink, Copy, CheckCheck, RotateCcw, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Cert {
  id: string
  certificateNo: string
  status: 'PENDING' | 'VERIFIED' | 'REVOKED'
  revokedReason: string | null
  issuedAt: string
  user: { id: string; name: string; phone: string }
  course: { id: string; title: string; category: string }
}

const STATUS_STYLES = {
  VERIFIED: { label: 'Verified', cls: 'bg-green-500/15 text-green-300 border-green-500/30', icon: CheckCircle2, iconCls: 'text-green-400' },
  PENDING:  { label: 'Pending',  cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',  icon: Clock,         iconCls: 'text-amber-400'  },
  REVOKED:  { label: 'Revoked',  cls: 'bg-red-500/15   text-red-300   border-red-500/30',    icon: XCircle,       iconCls: 'text-red-400'    },
}

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState<Cert[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REVOKED'>('ALL')
  const [revokeTarget, setRevokeTarget] = useState<Cert | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { fetchCerts() }, [])

  async function fetchCerts() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/certificates')
      if (res.ok) setCerts(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(cert: Cert) {
    setActionLoading(cert.id)
    try {
      const res = await fetch(`/api/admin/certificates/${cert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Certificate verified for ${cert.user.name}`)
      setCerts(prev => prev.map(c => c.id === cert.id ? { ...c, status: 'VERIFIED', revokedReason: null } : c))
    } catch {
      toast.error('Failed to verify certificate')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRevoke() {
    if (!revokeTarget || !revokeReason.trim()) return
    setActionLoading(revokeTarget.id)
    try {
      const res = await fetch(`/api/admin/certificates/${revokeTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', reason: revokeReason }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Certificate revoked for ${revokeTarget.user.name}`)
      setCerts(prev => prev.map(c => c.id === revokeTarget.id ? { ...c, status: 'REVOKED', revokedReason: revokeReason } : c))
      setRevokeTarget(null)
      setRevokeReason('')
    } catch {
      toast.error('Failed to revoke certificate')
    } finally {
      setActionLoading(null)
    }
  }

  function copyVerifyLink(cert: Cert) {
    const url = `${window.location.origin}/verify/${cert.certificateNo}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(cert.id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const filtered = certs.filter(c => {
    const matchFilter = filter === 'ALL' || c.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || c.user.name.toLowerCase().includes(q) || c.course.title.toLowerCase().includes(q) || c.certificateNo.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const counts = {
    ALL: certs.length,
    PENDING: certs.filter(c => c.status === 'PENDING').length,
    VERIFIED: certs.filter(c => c.status === 'VERIFIED').length,
    REVOKED: certs.filter(c => c.status === 'REVOKED').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Award className="w-7 h-7 text-amber-400" />
          <span className="gradient-text">Certificate Verification</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm">Review and verify student certificates</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['ALL', 'PENDING', 'VERIFIED', 'REVOKED'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`glass-card p-4 text-left transition-all rounded-2xl border ${
              filter === s ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/8 hover:border-white/15'
            }`}>
            <div className={`text-2xl font-display font-bold ${
              s === 'VERIFIED' ? 'text-green-400' :
              s === 'PENDING'  ? 'text-amber-400' :
              s === 'REVOKED'  ? 'text-red-400'    : 'gradient-text'
            }`}>{counts[s]}</div>
            <div className="text-xs text-white/40 mt-0.5">{s === 'ALL' ? 'Total' : s.charAt(0) + s.slice(1).toLowerCase()}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          className="input-field pl-9 text-sm"
          placeholder="Search by student name, course or certificate ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-purple-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center text-white/30">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No certificates found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/8">
                <tr className="text-left text-white/40 text-xs">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Course</th>
                  <th className="px-5 py-3 font-medium">Issued</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((cert, i) => {
                  const style = STATUS_STYLES[cert.status]
                  const Icon = style.icon
                  return (
                    <motion.tr key={cert.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {cert.user.name[0].toUpperCase()}
                          </div>
                          <div>
                            <Link href={`/admin/students/${cert.user.id}`} className="font-medium hover:text-purple-300 transition-colors">
                              {cert.user.name}
                            </Link>
                            <p className="text-xs text-white/30">{cert.user.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium truncate max-w-[180px]">{cert.course.title}</p>
                        <p className="text-xs text-white/30">{cert.course.category}</p>
                      </td>
                      <td className="px-5 py-4 text-white/50 text-xs whitespace-nowrap">
                        {new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.cls}`}>
                            <Icon className={`w-3 h-3 ${style.iconCls}`} />
                            {style.label}
                          </span>
                          {cert.status === 'REVOKED' && cert.revokedReason && (
                            <p className="text-xs text-red-400/60 mt-1 max-w-[140px] truncate" title={cert.revokedReason}>
                              {cert.revokedReason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {/* Copy verify link */}
                          <button onClick={() => copyVerifyLink(cert)}
                            title="Copy verification link"
                            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-white/30 hover:text-white">
                            {copied === cert.id ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                          {/* Open verify page */}
                          <a href={`/verify/${cert.certificateNo}`} target="_blank" rel="noopener noreferrer"
                            title="Open verification page"
                            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-white/30 hover:text-white">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          {/* Verify */}
                          {cert.status !== 'VERIFIED' && (
                            <button
                              onClick={() => handleVerify(cert)}
                              disabled={actionLoading === cert.id}
                              title="Mark as verified"
                              className="p-1.5 rounded-lg hover:bg-green-500/15 transition-colors text-white/30 hover:text-green-400 disabled:opacity-40">
                              {actionLoading === cert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          )}
                          {/* Revoke */}
                          {cert.status !== 'REVOKED' && (
                            <button
                              onClick={() => { setRevokeTarget(cert); setRevokeReason('') }}
                              title="Revoke certificate"
                              className="p-1.5 rounded-lg hover:bg-red-500/15 transition-colors text-white/30 hover:text-red-400">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {/* Re-verify (undo revoke) */}
                          {cert.status === 'REVOKED' && (
                            <button
                              onClick={() => handleVerify(cert)}
                              disabled={actionLoading === cert.id}
                              title="Restore as verified"
                              className="p-1.5 rounded-lg hover:bg-amber-500/15 transition-colors text-white/30 hover:text-amber-400 disabled:opacity-40">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      <AnimatePresence>
        {revokeTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setRevokeTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card border border-red-500/30 p-6 rounded-2xl w-full max-w-md"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold">Revoke Certificate</h3>
                    <p className="text-xs text-white/40">This will mark the certificate as invalid</p>
                  </div>
                </div>
                <button onClick={() => setRevokeTarget(null)} className="text-white/30 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white/3 border border-white/8 mb-4 text-sm">
                <p className="font-medium">{revokeTarget.user.name}</p>
                <p className="text-white/40 text-xs">{revokeTarget.course.title}</p>
              </div>

              <div className="mb-5">
                <label className="text-xs text-white/50 mb-1.5 block">Reason for revocation *</label>
                <textarea
                  className="input-field resize-none h-24 text-sm"
                  placeholder="e.g. Fraudulent submission, plagiarism detected..."
                  value={revokeReason}
                  onChange={e => setRevokeReason(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setRevokeTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white hover:border-white/20 transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={!revokeReason.trim() || actionLoading === revokeTarget.id}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {actionLoading === revokeTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Revoke Certificate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

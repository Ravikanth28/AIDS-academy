'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, CheckCircle2, XCircle, Clock, Loader2, Search,
  ExternalLink, Copy, CheckCheck, RotateCcw, X, Filter,
  BarChart3, Target, TrendingUp, PieChart, ArrowUpDown
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
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterStudent, setFilterStudent] = useState<string>('ALL')
  const [filterCourse, setFilterCourse] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc')
  const [revokeTarget, setRevokeTarget] = useState<Cert | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  // Unique lists for filters
  const students = useMemo(() => {
    const map = new Map<string, string>()
    certs.forEach(c => map.set(c.user.id, c.user.name))
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [certs])

  const courses = useMemo(() => {
    const map = new Map<string, string>()
    certs.forEach(c => map.set(c.course.id, c.course.title))
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [certs])

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = certs.filter(c => {
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false
      if (filterStudent !== 'ALL' && c.user.id !== filterStudent) return false
      if (filterCourse !== 'ALL' && c.course.id !== filterCourse) return false
      if (search) {
        const q = search.toLowerCase()
        if (!c.user.name.toLowerCase().includes(q) && !c.course.title.toLowerCase().includes(q) && !c.certificateNo.toLowerCase().includes(q)) return false
      }
      return true
    })
    list.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
        case 'date-asc':  return new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime()
        case 'name-asc':  return a.user.name.localeCompare(b.user.name)
        case 'name-desc': return b.user.name.localeCompare(a.user.name)
      }
    })
    return list
  }, [certs, filterStatus, filterStudent, filterCourse, search, sortBy])

  // Live stats based on filtered data
  const stats = useMemo(() => {
    const total = filtered.length
    const uniqueStudents = new Set(filtered.map(c => c.user.id)).size
    const verified = filtered.filter(c => c.status === 'VERIFIED').length
    const pending = filtered.filter(c => c.status === 'PENDING').length
    const revoked = filtered.filter(c => c.status === 'REVOKED').length
    const verifyRate = total > 0 ? ((verified / total) * 100).toFixed(1) : '0.0'
    return { total, uniqueStudents, verified, pending, revoked, verifyRate }
  }, [filtered])

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

  async function handleBulkVerify() {
    const ids = Array.from(selectedIds)
    const toVerify = ids.filter(id => certs.find(c => c.id === id)?.status !== 'VERIFIED')
    if (toVerify.length === 0) return toast.error('No unverified certificates selected')
    setBulkLoading(true)
    let success = 0
    for (const id of toVerify) {
      try {
        const res = await fetch(`/api/admin/certificates/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify' }),
        })
        if (res.ok) {
          success++
          setCerts(prev => prev.map(c => c.id === id ? { ...c, status: 'VERIFIED', revokedReason: null } : c))
        }
      } catch { /* skip */ }
    }
    toast.success(`${success} certificate${success > 1 ? 's' : ''} verified`)
    setSelectedIds(new Set())
    setBulkLoading(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)))
    }
  }

  function copyVerifyLink(cert: Cert) {
    const url = `${window.location.origin}/verify/${cert.certificateNo}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(cert.id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length
  const someSelected = selectedIds.size > 0
  const selectedPendingCount = Array.from(selectedIds).filter(id => {
    const c = certs.find(x => x.id === id)
    return c && c.status !== 'VERIFIED'
  }).length

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

      {/* Live stats — update with filters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="glass-card p-4 md:col-span-1 rounded-2xl border border-white/8">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Total</p>
          </div>
          <p className="font-display text-2xl font-bold gradient-text">{stats.total}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{stats.uniqueStudents} students</p>
        </div>
        <div className="glass-card p-4 md:col-span-1 rounded-2xl border border-green-500/20 cursor-pointer hover:border-green-500/40 transition-colors"
          onClick={() => setFilterStatus(filterStatus === 'VERIFIED' ? 'ALL' : 'VERIFIED')}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Verified</p>
          </div>
          <p className="font-display text-2xl font-bold text-green-400">{stats.verified}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{stats.verifyRate}% rate</p>
        </div>
        <div className="glass-card p-4 md:col-span-1 rounded-2xl border border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-colors"
          onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'ALL' : 'PENDING')}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Pending</p>
          </div>
          <p className="font-display text-2xl font-bold text-amber-400">{stats.pending}</p>
          <p className="text-[10px] text-white/30 mt-0.5">awaiting review</p>
        </div>
        <div className="glass-card p-4 md:col-span-1 rounded-2xl border border-red-500/20 cursor-pointer hover:border-red-500/40 transition-colors"
          onClick={() => setFilterStatus(filterStatus === 'REVOKED' ? 'ALL' : 'REVOKED')}>
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Revoked</p>
          </div>
          <p className="font-display text-2xl font-bold text-red-400">{stats.revoked}</p>
          <p className="text-[10px] text-white/30 mt-0.5">invalidated</p>
        </div>
        <div className="glass-card p-4 md:col-span-1 rounded-2xl border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Verify Rate</p>
          </div>
          <p className="font-display text-2xl font-bold text-cyan-400">{stats.verifyRate}%</p>
          <p className="text-[10px] text-white/30 mt-0.5">of filtered</p>
        </div>
        <div className="glass-card p-4 md:col-span-1 rounded-2xl border border-white/8">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-3.5 h-3.5 text-violet-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Showing</p>
          </div>
          <p className="font-display text-2xl font-bold text-white/70">{filtered.length}</p>
          <p className="text-[10px] text-white/30 mt-0.5">of {certs.length} total</p>
        </div>
      </div>

      {/* Filters row */}
      <div className="glass-card p-4 rounded-2xl border border-white/8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-white/40 text-xs shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filters
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              className="input-field pl-8 py-2 text-sm h-9"
              placeholder="Search student, course, cert ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Student filter */}
          <select
            className="input-field py-2 text-sm h-9 min-w-[150px]"
            value={filterStudent}
            onChange={e => setFilterStudent(e.target.value)}
          >
            <option value="ALL">All Students</option>
            {students.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          {/* Course filter */}
          <select
            className="input-field py-2 text-sm h-9 min-w-[150px]"
            value={filterCourse}
            onChange={e => setFilterCourse(e.target.value)}
          >
            <option value="ALL">All Courses</option>
            {courses.map(([id, title]) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            className="input-field py-2 text-sm h-9"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REVOKED">Revoked</option>
          </select>

          {/* Sort */}
          <select
            className="input-field py-2 text-sm h-9"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
          </select>

          {/* Clear filters */}
          {(search || filterStudent !== 'ALL' || filterCourse !== 'ALL' || filterStatus !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setFilterStudent('ALL'); setFilterCourse('ALL'); setFilterStatus('ALL') }}
              className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-purple-500/10 border border-purple-500/30">
            <span className="text-sm font-medium text-purple-300">
              {selectedIds.size} selected
            </span>
            <span className="text-white/20">|</span>
            <button
              onClick={handleBulkVerify}
              disabled={bulkLoading || selectedPendingCount === 0}
              className="flex items-center gap-2 text-sm font-medium text-green-300 hover:text-green-200 disabled:opacity-40 transition-colors"
            >
              {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Verify {selectedPendingCount > 0 ? `${selectedPendingCount} selected` : 'selected'}
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-xs text-white/30 hover:text-white transition-colors flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Deselect all
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      className="rounded border-white/20 bg-white/5 text-purple-500 cursor-pointer" />
                  </th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">
                    <button onClick={() => setSortBy(sortBy === 'date-desc' ? 'date-asc' : 'date-desc')}
                      className="flex items-center gap-1 hover:text-white transition-colors">
                      Issued <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((cert, i) => {
                  const style = STATUS_STYLES[cert.status]
                  const Icon = style.icon
                  const isSelected = selectedIds.has(cert.id)
                  return (
                    <motion.tr key={cert.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className={`hover:bg-white/2 transition-colors ${isSelected ? 'bg-purple-500/5' : ''}`}>
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(cert.id)}
                          className="rounded border-white/20 bg-white/5 text-purple-500 cursor-pointer" />
                      </td>
                      <td className="px-4 py-4">
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
                      <td className="px-4 py-4">
                        <p className="font-medium truncate max-w-[180px]">{cert.course.title}</p>
                        <p className="text-xs text-white/30">{cert.course.category}</p>
                      </td>
                      <td className="px-4 py-4 text-white/50 text-xs whitespace-nowrap">
                        {new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-4">
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
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => copyVerifyLink(cert)} title="Copy verification link"
                            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-white/30 hover:text-white">
                            {copied === cert.id ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <a href={`/verify/${cert.certificateNo}`} target="_blank" rel="noopener noreferrer"
                            title="Open verification page"
                            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-white/30 hover:text-white">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          {cert.status !== 'VERIFIED' && (
                            <button onClick={() => handleVerify(cert)} disabled={actionLoading === cert.id}
                              title="Mark as verified"
                              className="p-1.5 rounded-lg hover:bg-green-500/15 transition-colors text-white/30 hover:text-green-400 disabled:opacity-40">
                              {actionLoading === cert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          )}
                          {cert.status !== 'REVOKED' && (
                            <button onClick={() => { setRevokeTarget(cert); setRevokeReason('') }}
                              title="Revoke certificate"
                              className="p-1.5 rounded-lg hover:bg-red-500/15 transition-colors text-white/30 hover:text-red-400">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {cert.status === 'REVOKED' && (
                            <button onClick={() => handleVerify(cert)} disabled={actionLoading === cert.id}
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
                <button onClick={handleRevoke}
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

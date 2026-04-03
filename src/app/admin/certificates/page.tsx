'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, CheckCircle2, XCircle, Clock, Loader2, Search,
  ExternalLink, Copy, CheckCheck, RotateCcw, X, Filter,
  BarChart3, TrendingUp, ArrowUpDown, ShieldCheck,
  FileText, Users, ChevronDown, RefreshCw, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { getPublicAppUrl } from '@/lib/app-url'

interface Cert {
  id: string
  certificateNo: string
  status: 'PENDING' | 'VERIFIED' | 'REVOKED'
  revokedReason: string | null
  issuedAt: string
  user: { id: string; name: string; phone: string }
  course: { id: string; title: string; category: string }
}

interface CourseOption {
  id: string
  title: string
}

const STATUS_STYLES = {
  VERIFIED: { label: 'Verified', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25', icon: CheckCircle2, iconCls: 'text-emerald-400', dot: 'bg-emerald-400' },
  PENDING:  { label: 'Pending',  cls: 'bg-amber-500/10 text-amber-300 border-amber-500/25',      icon: Clock,         iconCls: 'text-amber-400',   dot: 'bg-amber-400'  },
  REVOKED:  { label: 'Revoked',  cls: 'bg-red-500/10 text-red-300 border-red-500/25',             icon: XCircle,       iconCls: 'text-red-400',     dot: 'bg-red-400'    },
}

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState<Cert[]>([])
  const [allCourses, setAllCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterStudent, setFilterStudent] = useState<string>('ALL')
  const [filterCourse, setFilterCourse] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc')
  const [revokeTarget, setRevokeTarget] = useState<Cert | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [bulkRevokeOpen, setBulkRevokeOpen] = useState(false)
  const [bulkRevokeReason, setBulkRevokeReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchCerts()
    fetchCourses()
  }, [])

  async function fetchCerts() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/certificates')
      if (res.ok) setCerts(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function fetchCourses() {
    try {
      const res = await fetch('/api/admin/courses')
      if (!res.ok) return

      const data = await res.json()
      setAllCourses(data.map((course: { id: string; title: string }) => ({
        id: course.id,
        title: course.title,
      })))
    } catch {
      // Leave the filter usable with certificate-derived courses if the course list fails to load.
    }
  }

  const students = useMemo(() => {
    const map = new Map<string, string>()
    certs.forEach(c => map.set(c.user.id, c.user.name))
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [certs])

  const courses = useMemo(() => {
    const map = new Map<string, string>()
    allCourses.forEach(c => map.set(c.id, c.title))
    certs.forEach(c => map.set(c.course.id, c.course.title))
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [allCourses, certs])

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

  const stats = useMemo(() => {
    const total = certs.length
    const uniqueStudents = new Set(certs.map(c => c.user.id)).size
    const verified = certs.filter(c => c.status === 'VERIFIED').length
    const pending = certs.filter(c => c.status === 'PENDING').length
    const revoked = certs.filter(c => c.status === 'REVOKED').length
    const verifyRate = total > 0 ? ((verified / total) * 100).toFixed(1) : '0.0'
    return { total, uniqueStudents, verified, pending, revoked, verifyRate }
  }, [certs])

  const activeFiltersCount = [filterStatus !== 'ALL', filterStudent !== 'ALL', filterCourse !== 'ALL', search !== ''].filter(Boolean).length
  const filterSelectClassName = 'w-full border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-purple-500/40 transition-all'
  const dropdownOptionClassName = ''

  function exportCertificatesCsv() {
    if (filtered.length === 0) {
      toast.error('No certificates to export')
      return
    }

    const headers = [
      'Student Name',
      'Phone',
      'Course',
      'Category',
      'Certificate No',
      'Status',
      'Issued At',
      'Revoked Reason',
      'Verification URL',
    ]

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`

    const rows = filtered.map(cert => [
      cert.user.name,
      cert.user.phone,
      cert.course.title,
      cert.course.category,
      cert.certificateNo,
      cert.status,
      new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      cert.revokedReason || '',
      `${getPublicAppUrl()}/verify/${cert.certificateNo}`,
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => escapeCsv(String(cell))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateStamp = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `certificates-${dateStamp}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${filtered.length} certificate${filtered.length !== 1 ? 's' : ''}`)
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

  async function handleBulkRevoke() {
    const reason = bulkRevokeReason.trim()
    const ids = Array.from(selectedIds)
    const toRevoke = ids.filter(id => certs.find(c => c.id === id)?.status !== 'REVOKED')
    if (!reason) return toast.error('Revocation reason is required')
    if (toRevoke.length === 0) return toast.error('No active certificates selected')

    setBulkLoading(true)
    let success = 0
    for (const id of toRevoke) {
      try {
        const res = await fetch(`/api/admin/certificates/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'revoke', reason }),
        })
        if (res.ok) {
          success++
          setCerts(prev => prev.map(c => c.id === id ? { ...c, status: 'REVOKED', revokedReason: reason } : c))
        }
      } catch { /* skip */ }
    }

    toast.success(`${success} certificate${success > 1 ? 's' : ''} revoked`)
    setSelectedIds(new Set())
    setBulkRevokeOpen(false)
    setBulkRevokeReason('')
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
    const url = `${getPublicAppUrl()}/verify/${cert.certificateNo}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(cert.id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function clearAllFilters() {
    setSearch(''); setFilterStudent('ALL'); setFilterCourse('ALL'); setFilterStatus('ALL')
  }

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length
  const someSelected = selectedIds.size > 0
  const selectedPendingCount = Array.from(selectedIds).filter(id => {
    const c = certs.find(x => x.id === id)
    return c && c.status !== 'VERIFIED'
  }).length
  const selectedRevokableCount = Array.from(selectedIds).filter(id => {
    const c = certs.find(x => x.id === id)
    return c && c.status !== 'REVOKED'
  }).length

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-white/30 mb-2">
            <Link href="/admin" className="hover:text-white/60 transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-white/50">Certificates</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="gradient-text">Certificate Management</span>
              <p className="text-white/35 text-sm font-normal mt-0.5">Review, verify & manage student certificates</p>
            </div>
          </h1>
        </div>
        <div className="flex items-center gap-3 self-start">
          <button
            onClick={exportCertificatesCsv}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all disabled:opacity-40"
          >
            <FileText className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={fetchCerts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Statistics Overview ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Certificates */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] p-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Total Issued</p>
          </div>
          <p className="font-display text-3xl font-bold gradient-text">{stats.total}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <Users className="w-3 h-3 text-white/25" />
            <p className="text-xs text-white/30">{stats.uniqueStudents} unique students</p>
          </div>
        </div>

        {/* Verified */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
            filterStatus === 'VERIFIED'
              ? 'bg-emerald-500/[0.08] border-emerald-500/30 shadow-lg shadow-emerald-500/5'
              : 'bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-white/[0.08] hover:border-emerald-500/20'
          }`}
          onClick={() => setFilterStatus(filterStatus === 'VERIFIED' ? 'ALL' : 'VERIFIED')}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Verified</p>
          </div>
          <p className="font-display text-3xl font-bold text-emerald-400">{stats.verified}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500/60 transition-all duration-500" style={{ width: `${stats.total > 0 ? (stats.verified / stats.total) * 100 : 0}%` }} />
            </div>
            <span className="text-[10px] text-emerald-400/60 font-medium">{stats.verifyRate}%</span>
          </div>
        </div>

        {/* Pending */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
            filterStatus === 'PENDING'
              ? 'bg-amber-500/[0.08] border-amber-500/30 shadow-lg shadow-amber-500/5'
              : 'bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-white/[0.08] hover:border-amber-500/20'
          }`}
          onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'ALL' : 'PENDING')}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Pending Review</p>
          </div>
          <p className="font-display text-3xl font-bold text-amber-400">{stats.pending}</p>
          <p className="text-xs text-white/25 mt-2">
            {stats.pending > 0 ? 'Needs your attention' : 'All reviewed'}
          </p>
        </div>

        {/* Revoked */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
            filterStatus === 'REVOKED'
              ? 'bg-red-500/[0.08] border-red-500/30 shadow-lg shadow-red-500/5'
              : 'bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-white/[0.08] hover:border-red-500/20'
          }`}
          onClick={() => setFilterStatus(filterStatus === 'REVOKED' ? 'ALL' : 'REVOKED')}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Revoked</p>
          </div>
          <p className="font-display text-3xl font-bold text-red-400">{stats.revoked}</p>
          <p className="text-xs text-white/25 mt-2">Invalidated certificates</p>
        </div>
      </div>

      {/* ── Search & Filters Toolbar ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all duration-200"
              placeholder="Search by student name, course, or certificate number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 shrink-0 ${
              showFilters || activeFiltersCount > 0
                ? 'bg-purple-500/10 border-purple-500/25 text-purple-300'
                : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white hover:border-white/15'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-purple-500/30 text-purple-200 text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <select
              className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-9 text-sm text-white/60 focus:outline-none focus:border-purple-500/40 transition-all cursor-pointer"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={{ colorScheme: 'dark' }}
            >
              <option className={dropdownOptionClassName} value="date-desc">Newest First</option>
              <option className={dropdownOptionClassName} value="date-asc">Oldest First</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
          </div>
        </div>

        {/* Expandable filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-1.5 block">Student</label>
                    <select
                      className={filterSelectClassName}
                      value={filterStudent}
                      onChange={e => setFilterStudent(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                    >
                      <option className={dropdownOptionClassName} value="ALL">All Students</option>
                      {students.map(([id, name]) => (
                        <option className={dropdownOptionClassName} key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-1.5 block">Course</label>
                    <select
                      className={filterSelectClassName}
                      value={filterCourse}
                      onChange={e => setFilterCourse(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                    >
                      <option className={dropdownOptionClassName} value="ALL">All Courses</option>
                      {courses.map(([id, title]) => (
                        <option className={dropdownOptionClassName} key={id} value={id}>{title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-1.5 block">Status</label>
                    <select
                      className={filterSelectClassName}
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                    >
                      <option className={dropdownOptionClassName} value="ALL">All Statuses</option>
                      <option className={dropdownOptionClassName} value="PENDING">Pending</option>
                      <option className={dropdownOptionClassName} value="VERIFIED">Verified</option>
                      <option className={dropdownOptionClassName} value="REVOKED">Revoked</option>
                    </select>
                  </div>
                </div>
                {activeFiltersCount > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <span className="text-xs text-white/30">{filtered.length} of {certs.length} certificates shown</span>
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bulk Action Bar ── */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center gap-3 px-5 py-3.5 rounded-xl bg-purple-500/[0.08] border border-purple-500/20 backdrop-blur-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <CheckCheck className="w-4 h-4 text-purple-300" />
            </div>
            <span className="text-sm font-medium text-purple-200">
              {selectedIds.size} certificate{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="h-5 w-px bg-white/10 mx-1" />
            <button
              onClick={handleBulkVerify}
              disabled={bulkLoading || selectedPendingCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-sm font-medium text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-30 transition-all"
            >
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Verify {selectedPendingCount > 0 ? selectedPendingCount : ''} Selected
            </button>
            <button
              onClick={() => { setBulkRevokeOpen(true); setBulkRevokeReason('') }}
              disabled={bulkLoading || selectedRevokableCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/25 text-sm font-medium text-red-300 hover:bg-red-500/25 disabled:opacity-30 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" />
              Revoke {selectedRevokableCount > 0 ? selectedRevokableCount : ''} Selected
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5">
              <X className="w-3.5 h-3.5" /> Deselect
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Certificates Table ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
          <p className="text-sm text-white/30">Loading certificates...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <Award className="w-8 h-8 text-white/15" />
          </div>
          <div className="text-center">
            <p className="text-white/40 font-medium">No certificates found</p>
            <p className="text-sm text-white/20 mt-1">
              {activeFiltersCount > 0 ? 'Try adjusting your filters' : 'Certificates will appear here once students complete courses'}
            </p>
          </div>
          {activeFiltersCount > 0 && (
            <button onClick={clearAllFilters}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5 mt-2">
              <X className="w-4 h-4" /> Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          {/* Table header info */}
          <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
            <p className="text-xs text-white/30">
              Showing <span className="text-white/50 font-medium">{filtered.length}</span> of {certs.length} certificates
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-5 py-3.5 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      className="rounded border-white/20 bg-white/5 text-purple-500 cursor-pointer focus:ring-purple-500/30 focus:ring-offset-0" />
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] text-white/35 uppercase tracking-wider font-semibold">Student</th>
                  <th className="px-5 py-3.5 text-left text-[10px] text-white/35 uppercase tracking-wider font-semibold">Course</th>
                  <th className="px-5 py-3.5 text-left text-[10px] text-white/35 uppercase tracking-wider font-semibold hidden lg:table-cell">Certificate No.</th>
                  <th className="px-5 py-3.5 text-left">
                    <button onClick={() => setSortBy(sortBy === 'date-desc' ? 'date-asc' : 'date-desc')}
                      className="flex items-center gap-1.5 text-[10px] text-white/35 uppercase tracking-wider font-semibold hover:text-white/60 transition-colors">
                      Issued <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] text-white/35 uppercase tracking-wider font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right text-[10px] text-white/35 uppercase tracking-wider font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cert, i) => {
                  const style = STATUS_STYLES[cert.status]
                  const Icon = style.icon
                  const isSelected = selectedIds.has(cert.id)
                  const isExpanded = expandedRow === cert.id
                  return (
                    <motion.tr
                      key={cert.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      className={`group border-b border-white/[0.03] last:border-0 transition-colors duration-150 ${
                        isSelected ? 'bg-purple-500/[0.06]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(cert.id)}
                          className="rounded border-white/20 bg-white/5 text-purple-500 cursor-pointer focus:ring-purple-500/30 focus:ring-offset-0" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600/80 to-cyan-500/80 flex items-center justify-center text-xs font-bold flex-shrink-0 ring-2 ring-white/5">
                            {cert.user.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/admin/students/${cert.user.id}`}
                              className="font-medium text-white/90 hover:text-purple-300 transition-colors block truncate">
                              {cert.user.name}
                            </Link>
                            <p className="text-xs text-white/25 mt-0.5">{cert.user.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-medium text-white/80 truncate max-w-[200px]">{cert.course.title}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-white/30 font-medium uppercase tracking-wider">
                            {cert.course.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-white/40 font-mono bg-white/[0.04] px-2 py-1 rounded-md">
                            {cert.certificateNo}
                          </code>
                          <button onClick={() => copyVerifyLink(cert)} title="Copy verification link"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/5 text-white/30 hover:text-white">
                            {copied === cert.id ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-white/40">
                          <Calendar className="w-3.5 h-3.5 text-white/20" />
                          <span className="text-xs whitespace-nowrap">
                            {new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${style.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {style.label}
                          </span>
                          {cert.status === 'REVOKED' && cert.revokedReason && (
                            <p className="text-[10px] text-red-400/50 mt-1.5 max-w-[140px] truncate" title={cert.revokedReason}>
                              {cert.revokedReason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => copyVerifyLink(cert)} title="Copy verification link"
                            className="p-2 rounded-lg hover:bg-white/[0.06] transition-all text-white/25 hover:text-white lg:hidden">
                            {copied === cert.id ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <a href={`/verify/${cert.certificateNo}`} target="_blank" rel="noopener noreferrer"
                            title="Open verification page"
                            className="p-2 rounded-lg hover:bg-white/[0.06] transition-all text-white/25 hover:text-white">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          {cert.status !== 'VERIFIED' && (
                            <button onClick={() => handleVerify(cert)} disabled={actionLoading === cert.id}
                              title="Verify certificate"
                              className="p-2 rounded-lg hover:bg-emerald-500/10 transition-all text-white/25 hover:text-emerald-400 disabled:opacity-30">
                              {actionLoading === cert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          )}
                          {cert.status !== 'REVOKED' && (
                            <button onClick={() => { setRevokeTarget(cert); setRevokeReason('') }}
                              title="Revoke certificate"
                              className="p-2 rounded-lg hover:bg-red-500/10 transition-all text-white/25 hover:text-red-400">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {cert.status === 'REVOKED' && (
                            <button onClick={() => handleVerify(cert)} disabled={actionLoading === cert.id}
                              title="Restore certificate"
                              className="p-2 rounded-lg hover:bg-amber-500/10 transition-all text-white/25 hover:text-amber-400 disabled:opacity-30">
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

          {/* Table footer */}
          <div className="px-5 py-3 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-white/25">
              {someSelected
                ? `${selectedIds.size} of ${filtered.length} selected`
                : `${filtered.length} certificate${filtered.length !== 1 ? 's' : ''}`
              }
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/25">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> {stats.verified} verified
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> {stats.pending} pending
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" /> {stats.revoked} revoked
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Revoke Modal ── */}
      <AnimatePresence>
        {revokeTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setRevokeTarget(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#0c0c14] border border-red-500/20 p-0 rounded-2xl w-full max-w-md shadow-2xl shadow-red-500/5 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg">Revoke Certificate</h3>
                      <p className="text-xs text-white/35 mt-0.5">This action will invalidate the certificate</p>
                    </div>
                  </div>
                  <button onClick={() => setRevokeTarget(null)}
                    className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 space-y-5">
                {/* Certificate info card */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/80 to-cyan-500/80 flex items-center justify-center text-sm font-bold flex-shrink-0 ring-2 ring-white/5">
                    {revokeTarget.user.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white/90 truncate">{revokeTarget.user.name}</p>
                    <p className="text-xs text-white/35 truncate">{revokeTarget.course.title}</p>
                  </div>
                  <code className="text-[10px] text-white/25 font-mono bg-white/[0.04] px-2 py-1 rounded-md shrink-0">
                    {revokeTarget.certificateNo}
                  </code>
                </div>

                {/* Reason input */}
                <div>
                  <label className="text-xs text-white/45 font-medium mb-2 block">
                    Reason for revocation <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all duration-200 resize-none h-28"
                    placeholder="e.g. Fraudulent submission, plagiarism detected, identity mismatch..."
                    value={revokeReason}
                    onChange={e => setRevokeReason(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setRevokeTarget(null)}
                  className="flex-1 py-3 rounded-xl border border-white/[0.08] text-sm text-white/50 font-medium hover:text-white hover:bg-white/[0.04] hover:border-white/15 transition-all">
                  Cancel
                </button>
                <button onClick={handleRevoke}
                  disabled={!revokeReason.trim() || actionLoading === revokeTarget.id}
                  className="flex-1 py-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                  {actionLoading === revokeTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Revoke Certificate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulkRevokeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setBulkRevokeOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#0c0c14] border border-red-500/20 p-0 rounded-2xl w-full max-w-md shadow-2xl shadow-red-500/5 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg">Bulk Revoke Certificates</h3>
                      <p className="text-xs text-white/35 mt-0.5">This will revoke {selectedRevokableCount} selected certificate{selectedRevokableCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBulkRevokeOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-sm text-white/75">
                    Selected certificates from multiple students/courses will be marked as revoked with the same reason.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-white/45 font-medium mb-2 block">
                    Reason for revocation <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all duration-200 resize-none h-28"
                    placeholder="e.g. Fraudulent submissions, batch verification error, policy violation..."
                    value={bulkRevokeReason}
                    onChange={e => setBulkRevokeReason(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={() => setBulkRevokeOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-white/[0.08] text-sm text-white/50 font-medium hover:text-white hover:bg-white/[0.04] hover:border-white/15 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkRevoke}
                  disabled={!bulkRevokeReason.trim() || bulkLoading || selectedRevokableCount === 0}
                  className="flex-1 py-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Revoke Selected
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

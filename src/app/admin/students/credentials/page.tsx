'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  KeyRound, Search, Loader2, Eye, EyeOff, ChevronDown, ChevronUp,
  Phone, Mail, Calendar, BookOpen, Award, CheckCircle, XCircle, Clock,
  ExternalLink, Save, Shield, TrendingUp, FileText, Users, Filter,
  ArrowUpDown, ChevronUp as SortUp, ChevronDown as SortDown, X,
  GraduationCap, RefreshCw,
} from 'lucide-react'

/* ─────────────────────────  Types  ───────────────────────── */

interface StudentRow {
  id: string
  name: string
  phone: string
  email: string | null
  createdAt: string
  enrollments: Array<{
    id: string
    course: { id: string; title: string }
    moduleProgress: Array<{
      moduleId: string
      videoCompleted: boolean
      testPassed: boolean
    }>
  }>
  certificates: Array<{
    id: string
    certificateNo: string
    status: 'PENDING' | 'VERIFIED' | 'REVOKED'
    revokedReason: string | null
    issuedAt: string
    course: { id: string; title: string }
  }>
}

interface StudentDetail {
  enrollments: Array<{
    id: string
    enrolledAt: string
    course: {
      id: string
      title: string
      modules: Array<{ id: string; title: string; order: number }>
    }
    moduleProgress: Array<{
      moduleId: string
      module: { id: string; title: string; order: number }
      videoCompleted: boolean
      testPassed: boolean
      testScore: number | null
      completedAt: string | null
    }>
  }>
  testAttempts: Array<{
    id: string
    score: number
    passed: boolean
    createdAt: string
    module: { title: string; order: number }
  }>
  certificates: Array<{
    id: string
    certificateNo: string
    issuedAt: string
    status: 'PENDING' | 'VERIFIED' | 'REVOKED'
    revokedReason: string | null
    course: { id: string; title: string }
  }>
}

type SortKey = 'name' | 'joined' | 'courses' | 'certs'
type SortDir = 'asc' | 'desc'
type EnrollFilter = 'all' | 'enrolled' | 'not-enrolled'
type CertFilter = 'all' | 'verified' | 'pending' | 'none'

/* ─────────────────────────  Page  ───────────────────────── */

export default function CredentialsPage() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detailMap, setDetailMap] = useState<Record<string, StudentDetail>>({})
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [enrollFilter, setEnrollFilter] = useState<EnrollFilter>('all')
  const [certFilter, setCertFilter] = useState<CertFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('joined')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Per-student password reset
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  const [showPw, setShowPw] = useState<Record<string, boolean>>({})
  const [savingPw, setSavingPw] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/students')
      .then(r => r.json())
      .then(data => { setStudents(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (detailMap[id]) return
    setLoadingDetail(id)
    try {
      const data = await fetch(`/api/admin/students/${id}`).then(r => r.json())
      setDetailMap(prev => ({ ...prev, [id]: data }))
    } catch { toast.error('Failed to load student details') }
    finally { setLoadingDetail(null) }
  }

  async function handleResetPassword(student: StudentRow) {
    const pw = passwords[student.id]?.trim()
    if (!pw) return toast.error('Enter a new password')
    if (pw.length < 4) return toast.error('Password must be at least 4 characters')
    setSavingPw(student.id)
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to reset')
      toast.success(`Password reset for ${student.name}`)
      setPasswords(p => ({ ...p, [student.id]: '' }))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset password')
    } finally { setSavingPw(null) }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function clearFilters() {
    setEnrollFilter('all'); setCertFilter('all')
    setSortKey('joined'); setSortDir('desc'); setSearch('')
  }

  const activeFilterCount = (enrollFilter !== 'all' ? 1 : 0) + (certFilter !== 'all' ? 1 : 0)

  const filtered = useMemo(() => {
    let list = students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      (s.email?.toLowerCase() ?? '').includes(search.toLowerCase())
    )
    if (enrollFilter === 'enrolled') list = list.filter(s => s.enrollments.length > 0)
    if (enrollFilter === 'not-enrolled') list = list.filter(s => s.enrollments.length === 0)
    if (certFilter === 'verified') list = list.filter(s => s.certificates.some(c => c.status === 'VERIFIED'))
    if (certFilter === 'pending') list = list.filter(s => s.certificates.some(c => c.status === 'PENDING'))
    if (certFilter === 'none') list = list.filter(s => s.certificates.length === 0)

    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'joined') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      else if (sortKey === 'courses') cmp = a.enrollments.length - b.enrollments.length
      else if (sortKey === 'certs') cmp = a.certificates.length - b.certificates.length
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [students, search, enrollFilter, certFilter, sortKey, sortDir])

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )

  const totalEnrolled = students.filter(s => s.enrollments.length > 0).length
  const totalVerified = students.reduce((a, s) => a + s.certificates.filter(c => c.status === 'VERIFIED').length, 0)
  const totalPending = students.reduce((a, s) => a + s.certificates.filter(c => c.status === 'PENDING').length, 0)

  return (
    <div className="space-y-5">

      {/* ── Hero / Stats bar ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/30 via-dark-200 to-blue-900/10 p-5 sm:p-6"
      >
        <div className="absolute -top-10 -right-10 w-56 h-56 bg-purple-500/6 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1.5">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400/70 text-xs font-medium uppercase tracking-wider">Student Management</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">Credentials &amp; Profiles</h1>
          <p className="text-white/40 text-sm mb-5">View login details, reset passwords and inspect progress for every student</p>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Students', value: students.length, color: 'from-purple-600 to-violet-600', textColor: 'text-purple-300', borderColor: 'border-purple-500/20', icon: Users },
              { label: 'Enrolled', value: totalEnrolled, color: 'from-blue-600 to-cyan-500', textColor: 'text-blue-300', borderColor: 'border-blue-500/20', icon: BookOpen },
              { label: 'Verified Certs', value: totalVerified, color: 'from-green-600 to-emerald-500', textColor: 'text-green-300', borderColor: 'border-green-500/20', icon: Award },
              { label: 'Pending Certs', value: totalPending, color: 'from-amber-500 to-orange-500', textColor: 'text-amber-300', borderColor: 'border-amber-500/20', icon: Clock },
            ].map(stat => (
              <div key={stat.label} className={`rounded-xl border ${stat.borderColor} bg-white/3 px-4 py-3 flex items-center gap-3`}>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0 opacity-80`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className={`font-display text-xl font-bold ${stat.textColor}`}>{stat.value}</div>
                  <div className="text-[10px] text-white/30 leading-tight">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Search + Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/20"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle button */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex-shrink-0
            ${showFilters || activeFilterCount > 0
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
            }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* ── Filter Panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl border border-white/8 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Enrollment filter */}
                <div>
                  <label className="block text-xs text-white/35 mb-1.5 font-medium uppercase tracking-wide">Enrollment</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['all', 'enrolled', 'not-enrolled'] as EnrollFilter[]).map(v => (
                      <button key={v}
                        onClick={() => setEnrollFilter(v)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${enrollFilter === v
                          ? 'bg-purple-500/25 border-purple-500/40 text-purple-300'
                          : 'bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:border-white/15'}`}
                      >
                        {v === 'all' ? 'All' : v === 'enrolled' ? 'Enrolled' : 'Not Enrolled'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Certificate filter */}
                <div>
                  <label className="block text-xs text-white/35 mb-1.5 font-medium uppercase tracking-wide">Certificates</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['all', 'verified', 'pending', 'none'] as CertFilter[]).map(v => (
                      <button key={v}
                        onClick={() => setCertFilter(v)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${certFilter === v
                          ? 'bg-amber-500/25 border-amber-500/40 text-amber-300'
                          : 'bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:border-white/15'}`}
                      >
                        {v === 'all' ? 'All' : v === 'verified' ? 'Has Verified' : v === 'pending' ? 'Has Pending' : 'No Certs'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs text-white/35 mb-1.5 font-medium uppercase tracking-wide">Sort By</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {([['name', 'Name'], ['joined', 'Joined'], ['courses', 'Courses'], ['certs', 'Certs']] as [SortKey, string][]).map(([k, label]) => (
                      <button key={k}
                        onClick={() => toggleSort(k)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all border ${sortKey === k
                          ? 'bg-cyan-500/20 border-cyan-500/35 text-cyan-300'
                          : 'bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:border-white/15'}`}
                      >
                        {label}
                        {sortKey === k && (sortDir === 'asc'
                          ? <SortUp className="w-2.5 h-2.5" />
                          : <SortDown className="w-2.5 h-2.5" />)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clear filters */}
              {(activeFilterCount > 0 || search || sortKey !== 'joined') && (
                <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                  <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
                    <RefreshCw className="w-3 h-3" /> Reset all filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result count bar ── */}
      <div className="flex items-center justify-between text-xs text-white/30 px-1">
        <span>
          Showing <span className="text-white/60 font-medium">{filtered.length}</span> of {students.length} students
          {(activeFilterCount > 0 || search) && (
            <span className="ml-2 text-purple-400/60">· filtered</span>
          )}
        </span>
        {sortKey && (
          <span className="flex items-center gap-1">
            Sorted by <span className="text-white/50">{sortKey}</span>
            {sortDir === 'asc' ? <SortUp className="w-3 h-3" /> : <SortDown className="w-3 h-3" />}
          </span>
        )}
      </div>

      {/* ── Column header (desktop only, decorative) ── */}
      <div className="hidden lg:grid grid-cols-[auto_1fr_160px_90px_90px_36px] gap-3 px-4 text-[10px] font-semibold text-white/20 uppercase tracking-wider border-b border-white/5 pb-2">
        <div className="w-10" />
        <div>Student</div>
        <div>Phone / Email</div>
        <div className="text-center cursor-pointer hover:text-white/40 transition-colors" onClick={() => toggleSort('courses')}>
          <span className="flex items-center justify-center gap-1">Courses {sortKey === 'courses' ? (sortDir === 'asc' ? <SortUp className="w-2.5 h-2.5" /> : <SortDown className="w-2.5 h-2.5" />) : <ArrowUpDown className="w-2.5 h-2.5" />}</span>
        </div>
        <div className="text-center cursor-pointer hover:text-white/40 transition-colors" onClick={() => toggleSort('certs')}>
          <span className="flex items-center justify-center gap-1">Certs {sortKey === 'certs' ? (sortDir === 'asc' ? <SortUp className="w-2.5 h-2.5" /> : <SortDown className="w-2.5 h-2.5" />) : <ArrowUpDown className="w-2.5 h-2.5" />}</span>
        </div>
        <div />
      </div>

      {/* ── Student List ── */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card rounded-2xl border border-white/8 p-16 text-center"
        >
          <Users className="w-12 h-12 text-white/8 mx-auto mb-3" />
          <p className="text-white/30 font-medium">No students match your filters</p>
          <button onClick={clearFilters} className="mt-3 text-xs text-purple-400/60 hover:text-purple-400 transition-colors">Clear filters</button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filtered.map((student, i) => {
            const isOpen = expanded === student.id
            const detail = detailMap[student.id]
            const isLoadingDet = loadingDetail === student.id
            const enrolledCount = student.enrollments.length
            const certCount = student.certificates.length
            const verifiedCerts = student.certificates.filter(c => c.status === 'VERIFIED').length
            const pendingCerts = student.certificates.filter(c => c.status === 'PENDING').length

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isOpen ? 'border-purple-500/40 shadow-lg shadow-purple-500/10 bg-purple-500/3' : 'border-white/8 bg-white/[0.015] hover:border-white/15 hover:bg-white/3'
                }`}
              >
                {/* ── Row ── */}
                <button
                  onClick={() => toggleExpand(student.id)}
                  className="w-full text-left py-3.5 px-4 transition-colors"
                >
                  {/* Mobile layout */}
                  <div className="flex items-center gap-3 lg:hidden">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm bg-gradient-to-br ${isOpen ? 'from-purple-500 to-violet-600' : 'from-purple-700/60 to-cyan-700/60'}`}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{student.name}</div>
                      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-white/40"><Phone className="w-2.5 h-2.5" />{student.phone}</span>
                        {student.email && <span className="flex items-center gap-1 text-xs text-white/35 truncate max-w-[160px]"><Mail className="w-2.5 h-2.5" />{student.email}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-white/30"><BookOpen className="w-2.5 h-2.5" />{enrolledCount} courses</span>
                        <span className="flex items-center gap-1 text-[10px] text-white/30"><Award className="w-2.5 h-2.5" />{verifiedCerts}/{certCount} certs</span>
                        {pendingCerts > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{pendingCerts} pending</span>}
                      </div>
                    </div>
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors ${isOpen ? 'border-purple-500/40 bg-purple-500/15 text-purple-300' : 'border-white/10 text-white/25'}`}>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden lg:grid grid-cols-[auto_1fr_160px_90px_90px_36px] gap-3 items-center">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm bg-gradient-to-br ${isOpen ? 'from-purple-500 to-violet-600' : 'from-purple-700/60 to-cyan-700/60'}`}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + date */}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{student.name}</div>
                      <div className="text-[10px] text-white/25 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        Joined {new Date(student.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Phone + email */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs text-white/55 mb-0.5"><Phone className="w-2.5 h-2.5 text-white/25" />{student.phone}</div>
                      <div className="flex items-center gap-1 text-[10px] text-white/30 truncate">
                        <Mail className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
                        <span className="truncate">{student.email || <span className="italic text-white/15">No email</span>}</span>
                      </div>
                    </div>

                    {/* Courses */}
                    <div className="text-center">
                      <div className="font-display text-lg font-bold text-white/70">{enrolledCount}</div>
                      <div className="text-[9px] text-white/25">course{enrolledCount !== 1 ? 's' : ''}</div>
                    </div>

                    {/* Certs */}
                    <div className="text-center">
                      <div className={`font-display text-lg font-bold ${verifiedCerts > 0 ? 'text-green-400/80' : 'text-white/40'}`}>{verifiedCerts}</div>
                      <div className="text-[9px] text-white/25">
                        {pendingCerts > 0 ? (
                          <span className="text-amber-400/60">{pendingCerts} pending</span>
                        ) : `/ ${certCount}`}
                      </div>
                    </div>

                    {/* Toggle */}
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${isOpen ? 'border-purple-500/40 bg-purple-500/15 text-purple-300' : 'border-white/10 text-white/25'}`}>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </button>

                {/* ── Expanded Detail Panel ── */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      key="detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-purple-500/15 bg-black/25 p-4 sm:p-5">
                        {isLoadingDet ? (
                          <div className="flex items-center justify-center gap-2 py-10 text-white/30 text-sm">
                            <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> Loading details…
                          </div>
                        ) : detail ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                            {/* ────── COL 1: Credentials + Password Reset ────── */}
                            <div className="space-y-3">

                              {/* Section header */}
                              <div className="flex items-center gap-2 pb-2 border-b border-white/6">
                                <div className="w-5 h-5 rounded-md bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                  <Shield className="w-3 h-3 text-purple-400" />
                                </div>
                                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Login Credentials</span>
                              </div>

                              {/* Credential fields */}
                              <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/5">
                                {[
                                  { icon: Phone, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Phone', value: student.phone, mono: true },
                                  { icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Email', value: student.email || '—', mono: true },
                                  { icon: Calendar, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Registered', value: new Date(student.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), mono: false },
                                ].map(row => (
                                  <div key={row.label} className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.02]">
                                    <div className={`w-7 h-7 rounded-lg ${row.bg} border border-white/8 flex items-center justify-center flex-shrink-0`}>
                                      <row.icon className={`w-3.5 h-3.5 ${row.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[9px] text-white/25 uppercase tracking-wide">{row.label}</div>
                                      <div className={`text-xs text-white/80 truncate ${row.mono ? 'font-mono' : ''}`}>{row.value}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Reset Password */}
                              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3">
                                <div className="flex items-center gap-2 mb-2.5">
                                  <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/25 flex items-center justify-center">
                                    <KeyRound className="w-3 h-3 text-amber-400" />
                                  </div>
                                  <span className="text-xs font-semibold text-amber-400/80">Reset Password</span>
                                </div>
                                <div className="relative mb-2">
                                  <input
                                    type={showPw[student.id] ? 'text' : 'password'}
                                    placeholder="Enter new password…"
                                    value={passwords[student.id] || ''}
                                    onChange={e => setPasswords(p => ({ ...p, [student.id]: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleResetPassword(student)}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 pr-9 text-xs focus:outline-none focus:border-amber-500/50 placeholder:text-white/15 text-white/80"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPw(p => ({ ...p, [student.id]: !p[student.id] }))}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                                  >
                                    {showPw[student.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleResetPassword(student)}
                                  disabled={savingPw === student.id || !passwords[student.id]?.trim()}
                                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 active:scale-[0.98] transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                                >
                                  {savingPw === student.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Set New Password</>}
                                </button>
                              </div>

                              {/* Full profile link */}
                              <Link
                                href={`/admin/students/${student.id}`}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/8 text-white/30 text-xs font-medium hover:text-white/60 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open Full Profile
                              </Link>
                            </div>

                            {/* ────── COL 2: Course Progress ────── */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 pb-2 border-b border-white/6">
                                <div className="w-5 h-5 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                  <TrendingUp className="w-3 h-3 text-blue-400" />
                                </div>
                                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Course Progress</span>
                                <span className="ml-auto text-[10px] text-white/20">{detail.enrollments.length} enrolled</span>
                              </div>

                              {detail.enrollments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                  <GraduationCap className="w-8 h-8 text-white/8 mb-2" />
                                  <p className="text-xs text-white/20">Not enrolled in any course</p>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  {detail.enrollments.map(enr => {
                                    const totalMods = enr.course.modules.length
                                    const passedMods = enr.moduleProgress.filter(m => m.testPassed).length
                                    const watchedMods = enr.moduleProgress.filter(m => m.videoCompleted).length
                                    const pct = totalMods > 0 ? Math.round((passedMods / totalMods) * 100) : 0
                                    const isComplete = passedMods === totalMods && totalMods > 0

                                    return (
                                      <div key={enr.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                          <span className="text-xs font-medium text-white/80 leading-snug flex-1">{enr.course.title}</span>
                                          <span className={`text-[9px] px-2 py-0.5 rounded-full border flex-shrink-0 font-semibold ${
                                            isComplete
                                              ? 'bg-green-500/15 border-green-500/20 text-green-300'
                                              : pct > 0
                                              ? 'bg-blue-500/15 border-blue-500/20 text-blue-300'
                                              : 'bg-white/5 border-white/8 text-white/25'
                                          }`}>
                                            {isComplete ? '✓ Done' : `${pct}%`}
                                          </span>
                                        </div>

                                        {/* Bar */}
                                        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-2.5">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.7, delay: 0.1 }}
                                            className={`h-full rounded-full bg-gradient-to-r ${isComplete ? 'from-green-500 to-emerald-400' : 'from-purple-500 to-cyan-500'}`}
                                          />
                                        </div>

                                        {/* Module dots */}
                                        <div className="flex flex-wrap gap-1 mb-2">
                                          {enr.course.modules.map(mod => {
                                            const prog = enr.moduleProgress.find(p => p.moduleId === mod.id)
                                            return (
                                              <span key={mod.id}
                                                title={`M${mod.order}: ${mod.title}${prog?.testScore != null ? ` — ${prog.testScore}%` : ''}`}
                                                className={`text-[9px] px-1.5 py-0.5 rounded-full border cursor-default ${
                                                  prog?.testPassed
                                                    ? 'bg-green-500/15 border-green-500/25 text-green-300'
                                                    : prog?.videoCompleted
                                                    ? 'bg-blue-500/15 border-blue-500/20 text-blue-300'
                                                    : 'bg-white/4 border-white/8 text-white/20'
                                                }`}
                                              >
                                                M{mod.order}
                                              </span>
                                            )
                                          })}
                                        </div>

                                        <div className="flex items-center justify-between text-[9px] text-white/20">
                                          <span>{passedMods}/{totalMods} passed · {watchedMods} videos watched</span>
                                          <span>{new Date(enr.enrolledAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* ────── COL 3: Certificates + Recent Tests ────── */}
                            <div className="space-y-3 md:col-span-2 xl:col-span-1">

                              {/* Certificates */}
                              <div className="flex items-center gap-2 pb-2 border-b border-white/6">
                                <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/25 flex items-center justify-center">
                                  <Award className="w-3 h-3 text-amber-400" />
                                </div>
                                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Certificates</span>
                                <span className="ml-auto text-[10px] text-white/20">{detail.certificates.length} total</span>
                              </div>

                              {detail.certificates.length === 0 ? (
                                <div className="flex flex-col items-center py-5 text-center">
                                  <Award className="w-7 h-7 text-white/6 mb-1.5" />
                                  <p className="text-xs text-white/20">No certificates yet</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {detail.certificates.map(cert => (
                                    <div key={cert.id} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <span className="text-xs font-medium text-white/75 leading-snug flex-1 truncate">{cert.course.title}</span>
                                        {cert.status === 'VERIFIED' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/20 flex-shrink-0 flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Verified</span>}
                                        {cert.status === 'PENDING' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 flex-shrink-0 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> Pending</span>}
                                        {cert.status === 'REVOKED' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/20 flex-shrink-0 flex items-center gap-0.5"><XCircle className="w-2.5 h-2.5" /> Revoked</span>}
                                      </div>
                                      <div className="text-[9px] text-white/20 font-mono truncate">{cert.certificateNo}</div>
                                      <div className="text-[9px] text-white/20 mt-0.5">
                                        {new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </div>
                                      {cert.revokedReason && <p className="text-[9px] text-red-300/50 mt-1 italic">"{cert.revokedReason}"</p>}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Recent Tests */}
                              {detail.testAttempts.length > 0 && (
                                <>
                                  <div className="flex items-center gap-2 pb-2 border-b border-white/6 pt-2">
                                    <div className="w-5 h-5 rounded-md bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                                      <FileText className="w-3 h-3 text-cyan-400" />
                                    </div>
                                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Recent Tests</span>
                                    <span className="ml-auto text-[10px] text-white/20">{detail.testAttempts.length} total</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {detail.testAttempts.slice(0, 5).map(attempt => (
                                      <div key={attempt.id} className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2">
                                        <span className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                                          attempt.passed ? 'bg-green-500/15 text-green-300 border border-green-500/20' : 'bg-red-500/15 text-red-300 border border-red-500/20'
                                        }`}>
                                          {attempt.score}%
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs text-white/55 truncate">M{attempt.module.order}: {attempt.module.title}</div>
                                          <div className="text-[9px] text-white/20 flex items-center gap-1">
                                            {attempt.passed ? <><CheckCircle className="w-2 h-2 text-green-400" /> Passed</> : <><XCircle className="w-2 h-2 text-red-400" /> Failed</>}
                                            · {new Date(attempt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {detail.testAttempts.length > 5 && (
                                      <p className="text-[10px] text-white/20 text-center px-2">
                                        +{detail.testAttempts.length - 5} more attempts — <Link href={`/admin/students/${student.id}`} className="text-purple-400/50 hover:text-purple-400 underline underline-offset-2">view full profile</Link>
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

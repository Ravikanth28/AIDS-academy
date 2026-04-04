'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Award, BookOpen, Search, Loader2, Plus, X, Save,
  User, Phone, Mail, Key, Filter, ArrowUpDown, ChevronUp,
  ChevronDown, ExternalLink, GraduationCap, Calendar,
} from 'lucide-react'
import { Pagination } from '@/components/Pagination'

const STUDENTS_PER_PAGE = 15

interface Student {
  id: string
  name: string
  phone: string
  email?: string
  createdAt: string
  enrollments: Array<{
    course: { id: string; title: string }
    moduleProgress: Array<{ testPassed: boolean }>
  }>
  certificates: Array<{ id: string; course: { id: string; title: string } }>
}

interface CourseOption {
  id: string
  title: string
}

type SortKey = 'name' | 'joined' | 'progress' | 'courses'
type SortDir = 'asc' | 'desc'
type CertFilter = 'all' | 'with-cert' | 'no-cert'
type EnrollFilter = 'all' | 'enrolled' | 'not-enrolled'
type StudentStatusFilter = 'all' | 'completed' | 'in-progress' | 'not-started'

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [certFilter, setCertFilter] = useState<CertFilter>('all')
  const [enrollFilter, setEnrollFilter] = useState<EnrollFilter>('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('joined')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState<'STUDENT' | 'ADMIN'>('STUDENT')

  function fetchStudents() {
    fetch('/api/admin/students?limit=100')
      .then((r) => r.json())
      .then((data) => { setStudents(Array.isArray(data) ? data : (data.students ?? [])); setLoading(false) })
  }

  function fetchCourses() {
    fetch('/api/admin/courses')
      .then((r) => r.json())
      .then((data) => {
        const nextCourses = Array.isArray(data)
          ? data.map((course: { id: string; title: string }) => ({ id: course.id, title: course.title }))
          : []
        setCourses(nextCourses)
      })
      .catch(() => setCourses([]))
  }

  useEffect(() => {
    fetchStudents()
    fetchCourses()
  }, [])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function getProgress(s: Student) {
    const total = s.enrollments.reduce((a, e) => a + e.moduleProgress.length, 0)
    const done = s.enrollments.reduce((a, e) => a + e.moduleProgress.filter(p => p.testPassed).length, 0)
    return total === 0 ? 0 : Math.round((done / total) * 100)
  }

  function getCompletedCourseTitles(student: Student) {
    return Array.from(new Set(student.certificates.map(cert => cert.course.title))).sort((a, b) => a.localeCompare(b))
  }

  function getEnrolledCourseTitles(student: Student) {
    return Array.from(new Set(student.enrollments.map(enrollment => enrollment.course.title))).sort((a, b) => a.localeCompare(b))
  }

  function hasCourseEnrollment(student: Student, courseId: string) {
    return student.enrollments.some(enrollment => enrollment.course.id === courseId)
  }

  function hasCourseCertificate(student: Student, courseId: string) {
    return student.certificates.some(certificate => certificate.course.id === courseId)
  }

  function getStudentStatus(student: Student, courseId: string) {
    if (courseId !== 'all') {
      if (hasCourseCertificate(student, courseId)) return 'completed'
      if (hasCourseEnrollment(student, courseId)) return 'in-progress'
      return 'not-started'
    }

    if (student.certificates.length > 0) return 'completed'
    if (student.enrollments.length > 0) return 'in-progress'
    return 'not-started'
  }

  function getRelevantEnrollments(student: Student) {
    return courseFilter === 'all'
      ? student.enrollments
      : student.enrollments.filter(enrollment => enrollment.course.id === courseFilter)
  }

  const filtered = useMemo(() => students
    .filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase())
    )
    .filter(s => certFilter === 'all' ? true : certFilter === 'with-cert' ? s.certificates.length > 0 : s.certificates.length === 0)
    .filter(s => {
      if (enrollFilter === 'all') return true
      if (courseFilter === 'all') return enrollFilter === 'enrolled' ? s.enrollments.length > 0 : s.enrollments.length === 0
      return enrollFilter === 'enrolled' ? hasCourseEnrollment(s, courseFilter) : !hasCourseEnrollment(s, courseFilter)
    })
    .filter(s => statusFilter === 'all' ? true : getStudentStatus(s, courseFilter) === statusFilter)
    .sort((a, b) => {
      let av = 0, bv = 0
      if (sortKey === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      if (sortKey === 'joined') { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime() }
      if (sortKey === 'progress') { av = getProgress(a); bv = getProgress(b) }
      if (sortKey === 'courses') { av = a.enrollments.length; bv = b.enrollments.length }
      return sortDir === 'asc' ? av - bv : bv - av
    }), [students, search, certFilter, enrollFilter, courseFilter, statusFilter, sortKey, sortDir])

  // Reset to page 1 whenever filters/sort change
  useEffect(() => { setPage(1) }, [search, certFilter, enrollFilter, courseFilter, statusFilter, sortKey, sortDir])

  const paginated = filtered.slice((page - 1) * STUDENTS_PER_PAGE, page * STUDENTS_PER_PAGE)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!regName.trim()) return toast.error('Name is required')
    if (!/^\d{10}$/.test(regPhone)) return toast.error('Enter a valid 10-digit phone')
    setRegistering(true)
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(), phone: regPhone.trim(),
          email: regEmail.trim() || null, password: regPassword.trim() || null, role: regRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      toast.success(`${regRole === 'ADMIN' ? 'Admin' : 'Student'} registered!`)
      setShowRegister(false)
      setRegName(''); setRegPhone(''); setRegEmail(''); setRegPassword(''); setRegRole('STUDENT')
      fetchStudents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setRegistering(false)
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-purple-400" /> : <ChevronDown className="w-3 h-3 text-purple-400" />
  }

  const totalCerts = students.reduce((a, s) => a + s.certificates.length, 0)
  const totalEnrolled = students.filter(s => s.enrollments.length > 0).length
  const activeFilterCount = [certFilter !== 'all', enrollFilter !== 'all', courseFilter !== 'all', statusFilter !== 'all', search !== ''].filter(Boolean).length
  const selectedCourseLabel = courseFilter === 'all'
    ? 'All Courses'
    : courses.find(course => course.id === courseFilter)?.title || 'Selected Course'

  const filteredAnalytics = useMemo(() => {
    const enrolledCount = students.filter(student => (
      courseFilter === 'all' ? student.enrollments.length > 0 : hasCourseEnrollment(student, courseFilter)
    )).length
    const completedCount = students.filter(student => getStudentStatus(student, courseFilter) === 'completed').length
    const inProgressCount = students.filter(student => getStudentStatus(student, courseFilter) === 'in-progress').length

    return {
      total: students.length,
      enrolledCount,
      notEnrolledCount: students.length - enrolledCount,
      completedCount,
      inProgressCount,
    }
  }, [students, courseFilter])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            <span className="gradient-text">Students</span>
          </h1>
          <p className="text-white/40 mt-1">{students.length} registered users</p>
        </div>
        <button onClick={() => setShowRegister(true)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Register User
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Showing', sub: `of ${students.length} students`,
            value: filtered.length,
            gradient: 'from-purple-600 to-violet-600', text: 'text-purple-300', border: 'border-purple-500/20',
            icon: Users, active: false, onClick: undefined,
          },
          {
            label: 'Enrolled', sub: 'in view',
            value: filtered.filter(s => courseFilter === 'all' ? s.enrollments.length > 0 : hasCourseEnrollment(s, courseFilter)).length,
            gradient: 'from-cyan-600 to-blue-500', text: 'text-cyan-300', border: 'border-cyan-500/20',
            icon: BookOpen, active: enrollFilter === 'enrolled',
            onClick: () => setEnrollFilter(f => f === 'enrolled' ? 'all' : 'enrolled'),
          },
          {
            label: 'Has Certificate', sub: 'in view',
            value: filtered.filter(s => s.certificates.length > 0).length,
            gradient: 'from-amber-500 to-orange-500', text: 'text-amber-300', border: 'border-amber-500/20',
            icon: Award, active: certFilter === 'with-cert',
            onClick: () => setCertFilter(f => f === 'with-cert' ? 'all' : 'with-cert'),
          },
          {
            label: 'Not Started', sub: 'in view',
            value: filtered.filter(s => s.enrollments.length === 0).length,
            gradient: 'from-pink-600 to-rose-500', text: 'text-pink-300', border: 'border-pink-500/20',
            icon: GraduationCap, active: enrollFilter === 'not-enrolled',
            onClick: () => setEnrollFilter(f => f === 'not-enrolled' ? 'all' : 'not-enrolled'),
          },
        ].map(stat => (
          <div
            key={stat.label}
            onClick={stat.onClick}
            className={`rounded-2xl border p-4 flex items-center gap-3 transition-all duration-200 ${
              stat.onClick ? 'cursor-pointer hover:border-white/20' : ''
            } ${
              stat.active
                ? `bg-white/[0.06] ${stat.border} shadow-lg`
                : `bg-gradient-to-br from-white/[0.04] to-white/[0.01] ${stat.border}`
            }`}
          >
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center flex-shrink-0 opacity-80`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className={`font-display text-2xl font-bold ${stat.text}`}>{stat.value}</div>
              <div className="text-xs text-white/50 font-medium leading-tight">{stat.label}</div>
              <div className="text-[10px] text-white/25 leading-tight">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-4 mb-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              className="input-field pl-10 py-2.5 text-sm w-full"
              placeholder="Search name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              showFilters || activeFilterCount > 0
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-purple-500 rounded-full text-white text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setCertFilter('all'); setEnrollFilter('all'); setCourseFilter('all'); setStatusFilter('all'); setSearch('') }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:bg-zinc-500/10 transition-all border border-zinc-500/20"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mt-4 pt-4 border-t border-white/8">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-1.5 block">Course</label>
                    <select
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                      className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-purple-500/40 transition-all"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="all">All Courses</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-1.5 block">Certificate</label>
                    <select
                      value={certFilter}
                      onChange={(e) => setCertFilter(e.target.value as CertFilter)}
                      className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-purple-500/40 transition-all"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="all">All</option>
                      <option value="with-cert">Has Certificate</option>
                      <option value="no-cert">No Certificate</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-1.5 block">Enrollment</label>
                    <select
                      value={enrollFilter}
                      onChange={(e) => setEnrollFilter(e.target.value as EnrollFilter)}
                      className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-purple-500/40 transition-all"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="all">All</option>
                      <option value="enrolled">Enrolled</option>
                      <option value="not-enrolled">Not Enrolled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-1.5 block">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as StudentStatusFilter)}
                      className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-purple-500/40 transition-all"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="not-started">Not Started</option>
                    </select>
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <span className="text-xs text-white/30">{filtered.length} of {students.length} students shown</span>
                    <button
                      onClick={() => { setCertFilter('all'); setEnrollFilter('all'); setCourseFilter('all'); setStatusFilter('all'); setSearch('') }}
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

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">{search ? 'No students match your search' : 'No students yet'}</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3.5">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/70 transition-colors">
                      Student <SortIcon col="name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3.5 hidden md:table-cell">
                    <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Contact</span>
                  </th>
                  <th className="text-left px-4 py-3.5">
                    <button onClick={() => toggleSort('courses')} className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/70 transition-colors">
                      Courses <SortIcon col="courses" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3.5 hidden lg:table-cell">
                    <button onClick={() => toggleSort('progress')} className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/70 transition-colors">
                      Progress <SortIcon col="progress" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3.5 hidden md:table-cell">
                    <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Certs</span>
                  </th>
                  <th className="text-left px-4 py-3.5 hidden lg:table-cell">
                    <button onClick={() => toggleSort('joined')} className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/70 transition-colors">
                      Joined <SortIcon col="joined" />
                    </button>
                  </th>
                  <th className="px-4 py-3.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map((student) => {
                  const relevantEnrollments = getRelevantEnrollments(student)
                  const totalModules = relevantEnrollments.reduce((a, e) => a + e.moduleProgress.length, 0)
                  const doneMods = relevantEnrollments.reduce((a, e) => a + e.moduleProgress.filter(p => p.testPassed).length, 0)
                  const pct = totalModules === 0 ? 0 : Math.round((doneMods / totalModules) * 100)
                  const completedCourseTitles = courseFilter === 'all'
                    ? getCompletedCourseTitles(student)
                    : student.certificates
                      .filter(cert => cert.course.id === courseFilter)
                      .map(cert => cert.course.title)
                  const enrolledCourseTitles = courseFilter === 'all'
                    ? getEnrolledCourseTitles(student)
                    : relevantEnrollments.map(enrollment => enrollment.course.title)
                  const fallbackCourseTitles = enrolledCourseTitles.filter(title => !completedCourseTitles.includes(title))
                  const displayedCourseTitles = completedCourseTitles.length > 0 ? completedCourseTitles : fallbackCourseTitles
                  const courseCaption = completedCourseTitles.length > 0
                    ? `${completedCourseTitles.length} completed`
                    : fallbackCourseTitles.length > 0
                      ? 'In progress'
                      : ''
                  return (
                    <tr key={student.id} className="hover:bg-white/3 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {student.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm leading-tight">{student.name}</div>
                            <div className="text-xs text-white/30 md:hidden mt-0.5">{student.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="text-sm text-white/70 leading-tight">{student.phone}</div>
                        {student.email && <div className="text-xs text-white/30 mt-0.5 truncate max-w-36">{student.email}</div>}
                      </td>
                      <td className="px-4 py-4">
                        {student.enrollments.length === 0 ? (
                          <span className="text-xs text-white/25 italic">None</span>
                        ) : (
                          <div className="flex items-start gap-2.5 min-w-0">
                            <BookOpen className="w-3.5 h-3.5 text-cyan-400/70 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-sm text-white/80 truncate">
                                {displayedCourseTitles.join(', ')}
                              </div>
                              <div className="text-xs text-white/30 mt-0.5">
                                {courseCaption}
                                {totalModules > 0 && courseCaption ? ' • ' : ''}
                                {totalModules > 0 ? `${doneMods}/${totalModules} mod` : ''}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {totalModules === 0 ? (
                          <span className="text-xs text-white/25 italic">—</span>
                        ) : (
                          <div className="flex items-center gap-2.5 min-w-28">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct === 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                                  pct >= 50 ? 'bg-gradient-to-r from-purple-500 to-cyan-500' :
                                  'bg-gradient-to-r from-amber-500 to-orange-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium tabular-nums ${
                              pct === 100 ? 'text-green-400' : pct >= 50 ? 'text-purple-300' : 'text-amber-400'
                            }`}>{pct}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        {student.certificates.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
                            <Award className="w-3 h-3" /> {student.certificates.length}
                          </span>
                        ) : (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(student.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/admin/students/${student.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-purple-500/20 text-white/20 hover:text-purple-400 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-2">
            <Pagination
              page={page}
              total={filtered.length}
              perPage={STUDENTS_PER_PAGE}
              onChange={setPage}
            />
          </div>
        </div>
      )}

      {showRegister && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowRegister(false)}>
          <div className="glass-card gradient-border p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-lg">Register New User</h2>
              <button onClick={() => setShowRegister(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Name *
                </label>
                <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="input-field" placeholder="Full name" required />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone *
                </label>
                <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="input-field" placeholder="10-digit number" required />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="input-field" placeholder="Optional" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Password
                </label>
                <input type="text" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="input-field" placeholder="Optional password" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Role</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setRegRole('STUDENT')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${regRole === 'STUDENT' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >Student</button>
                  <button type="button" onClick={() => setRegRole('ADMIN')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${regRole === 'ADMIN' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >Admin</button>
                </div>
              </div>
              <button type="submit" disabled={registering} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Register
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

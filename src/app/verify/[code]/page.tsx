'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2, ShieldCheck, AlertTriangle, BookOpen, User, Calendar, Hash } from 'lucide-react'
import Link from 'next/link'

interface VerifyResult {
  valid: boolean
  status: 'PENDING' | 'VERIFIED' | 'REVOKED'
  studentName: string
  courseName: string
  courseCategory: string
  issuedAt: string
  certificateNo: string
  revokedReason: string | null
  error?: string
}

export default function VerifyPage() {
  const params = useParams()
  const code = params?.code as string
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!code) return
    fetch(`/api/verify/${code}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) { setNotFound(true); return }
        setResult(data)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [code])

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium mb-4">
            <ShieldCheck className="w-4 h-4" />
            Certificate Verification
          </div>
          <h1 className="font-display text-3xl font-bold gradient-text">AI·DS Academy</h1>
          <p className="text-white/40 text-sm mt-1">Official Certificate Verification Portal</p>
        </div>

        {loading && (
          <div className="glass-card p-12 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
            <p className="text-white/50 text-sm">Verifying certificate...</p>
          </div>
        )}

        {!loading && notFound && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 flex flex-col items-center gap-4 text-center border border-red-500/20">
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-red-300">Certificate Not Found</h2>
            <p className="text-white/40 text-sm">No certificate matches this verification code. It may be invalid or not yet issued.</p>
          </motion.div>
        )}

        {!loading && result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-8 border ${
              result.status === 'VERIFIED'
                ? 'border-green-500/30'
                : result.status === 'REVOKED'
                ? 'border-red-500/30'
                : 'border-amber-500/30'
            }`}>

            {/* Status Banner */}
            {result.status === 'VERIFIED' && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/25 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-300 text-lg">✓ Valid Certificate</p>
                  <p className="text-green-400/60 text-xs">This certificate has been verified by AI·DS Academy</p>
                </div>
              </div>
            )}
            {result.status === 'PENDING' && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="font-bold text-amber-300 text-lg">⏳ Pending Verification</p>
                  <p className="text-amber-400/60 text-xs">This certificate is awaiting admin verification</p>
                </div>
              </div>
            )}
            {result.status === 'REVOKED' && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 mb-6">
                <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-300 text-lg">✗ Certificate Revoked</p>
                  {result.revokedReason && (
                    <p className="text-red-400/70 text-xs mt-0.5">Reason: {result.revokedReason}</p>
                  )}
                </div>
              </div>
            )}

            {/* Certificate Details */}
            <div className="space-y-4">
              <h2 className="font-display font-bold text-lg text-white/80 border-b border-white/8 pb-3">Certificate Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Student Name</p>
                    <p className="font-semibold text-white">{result.studentName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Course Completed</p>
                    <p className="font-semibold text-white">{result.courseName}</p>
                    <p className="text-xs text-white/40">{result.courseCategory}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Issued On</p>
                    <p className="font-semibold text-white">
                      {new Date(result.issuedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-4 h-4 text-white/40" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Certificate ID</p>
                    <p className="font-mono text-xs text-white/60">{result.certificateNo}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <p className="text-center text-white/20 text-xs mt-6">
          Questions? Contact{' '}
          <Link href="/" className="text-purple-400 hover:text-purple-300">AI·DS Academy</Link>
        </p>
      </div>
    </div>
  )
}

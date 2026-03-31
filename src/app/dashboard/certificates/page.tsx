'use client'

import { useEffect, useState } from 'react'
import { Award, Loader2, Trophy } from 'lucide-react'
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

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/student/certificates')
      .then((r) => r.json())
      .then((data) => {
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold flex items-center gap-3">
          <Award className="w-7 h-7 text-amber-400" />
          My Certificates
        </h1>
        <p className="text-white/40 mt-1">Proof of your hard work and dedication</p>
      </div>

      {certs.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Trophy className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 text-lg">No certificates yet</p>
          <p className="text-white/20 text-sm mt-1">Complete all modules in a course to earn your certificate</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {certs.map((cert) => (
              <button
                key={cert.id}
                onClick={() => setSelected(selected === cert.id ? null : cert.id)}
                className={`glass-card glass-card-hover p-5 text-left transition-all border
                  ${selected === cert.id
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-white/8 hover:border-amber-500/20'}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-sm leading-tight">
                      {cert.course.title}
                    </h3>
                    <p className="text-white/30 text-xs mt-0.5">{cert.course.category}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Issued</span>
                    <span className="text-white/60">
                      {new Date(cert.issuedAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Cert No.</span>
                    <span className="text-amber-300/70 font-mono">{cert.certificateNo.slice(0, 12)}…</span>
                  </div>
                </div>

                <div className="mt-3 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" />
                </div>
                <p className="text-center text-xs text-amber-400/60 mt-1">
                  {selected === cert.id ? 'Click to close' : 'Click to view & download'}
                </p>
              </button>
            ))}
          </div>

          {/* Expanded cert view */}
          {selected && (() => {
            const cert = certs.find((c) => c.id === selected)!
            return (
              <div className="animate-fade-in">
                <CertificateCard
                  studentName={cert.user.name}
                  courseName={cert.course.title}
                  courseDescription={cert.course.description}
                  issuedAt={cert.issuedAt}
                  certificateNo={cert.certificateNo}
                />
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

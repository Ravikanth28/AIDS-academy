'use client'

import { useRef, useState, useEffect } from 'react'
import { Download, Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react'

interface CertificateCardProps {
  studentName: string
  courseName: string
  courseDescription?: string
  issuedAt: string
  certificateNo: string
  status?: 'PENDING' | 'VERIFIED' | 'REVOKED'
  revokedReason?: string | null
}

export default function CertificateCard({
  studentName,
  courseName,
  courseDescription,
  issuedAt,
  certificateNo,
  status = 'PENDING',
  revokedReason,
}: CertificateCardProps) {
  const certRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const verifyUrl = `${origin}/verify/${certificateNo}`

  const issueDate = new Date(issuedAt)
  const monthYear = issueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const fullDate = issueDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  async function downloadPDF() {
    if (!certRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#0a0e27',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 3, canvas.height / 3],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3)
      pdf.save(`Certificate-${certificateNo}.pdf`)
    } catch (err) {
      console.error('PDF export failed', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Certificate Render Target */}
      <div
        ref={certRef}
        style={{
          background: 'linear-gradient(135deg, #080c22 0%, #0f1436 40%, #141a42 60%, #0a0e27 100%)',
          fontFamily: 'Georgia, "Times New Roman", serif',
          padding: '20px',
          minHeight: 580,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle radial glow behind center */}
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(212,162,55,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Corner ornaments - larger and more detailed */}
        <div style={{ position: 'absolute', top: 28, left: 28, width: 70, height: 70, borderTop: '2.5px solid #d4a23750', borderLeft: '2.5px solid #d4a23750' }} />
        <div style={{ position: 'absolute', top: 36, left: 36, width: 30, height: 30, borderTop: '1px solid #d4a23730', borderLeft: '1px solid #d4a23730' }} />
        <div style={{ position: 'absolute', top: 28, right: 28, width: 70, height: 70, borderTop: '2.5px solid #d4a23750', borderRight: '2.5px solid #d4a23750' }} />
        <div style={{ position: 'absolute', top: 36, right: 36, width: 30, height: 30, borderTop: '1px solid #d4a23730', borderRight: '1px solid #d4a23730' }} />
        <div style={{ position: 'absolute', bottom: 28, left: 28, width: 70, height: 70, borderBottom: '2.5px solid #d4a23750', borderLeft: '2.5px solid #d4a23750' }} />
        <div style={{ position: 'absolute', bottom: 36, left: 36, width: 30, height: 30, borderBottom: '1px solid #d4a23730', borderLeft: '1px solid #d4a23730' }} />
        <div style={{ position: 'absolute', bottom: 28, right: 28, width: 70, height: 70, borderBottom: '2.5px solid #d4a23750', borderRight: '2.5px solid #d4a23750' }} />
        <div style={{ position: 'absolute', bottom: 36, right: 36, width: 30, height: 30, borderBottom: '1px solid #d4a23730', borderRight: '1px solid #d4a23730' }} />

        {/* Left side vertical ornament */}
        <div style={{ position: 'absolute', left: 38, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 1, height: 50, background: 'linear-gradient(180deg, transparent, #d4a23740)' }} />
          <span style={{ color: '#d4a23740', fontSize: 8 }}>✦</span>
          <div style={{ width: 6, height: 6, border: '1px solid #d4a23740', transform: 'rotate(45deg)' }} />
          <span style={{ color: '#d4a23740', fontSize: 8 }}>✦</span>
          <div style={{ width: 1, height: 20, background: '#d4a23730' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1px solid #d4a23740' }} />
          <div style={{ width: 1, height: 20, background: '#d4a23730' }} />
          <span style={{ color: '#d4a23740', fontSize: 8 }}>✦</span>
          <div style={{ width: 6, height: 6, border: '1px solid #d4a23740', transform: 'rotate(45deg)' }} />
          <span style={{ color: '#d4a23740', fontSize: 8 }}>✦</span>
          <div style={{ width: 1, height: 50, background: 'linear-gradient(180deg, #d4a23740, transparent)' }} />
        </div>

        {/* Right side vertical ornament */}
        <div style={{ position: 'absolute', right: 38, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 1, height: 50, background: 'linear-gradient(180deg, transparent, #d4a23740)' }} />
          <span style={{ color: '#d4a23740', fontSize: 8 }}>✦</span>
          <div style={{ width: 6, height: 6, border: '1px solid #d4a23740', transform: 'rotate(45deg)' }} />
          <span style={{ color: '#d4a23740', fontSize: 8 }}>✦</span>
          <div style={{ width: 1, height: 20, background: '#d4a23730' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1px solid #d4a23740' }} />
          <div style={{ width: 1, height: 20, background: '#d4a23730' }} />
          <span style={{ color: '#d4a23740', fontSize: 8 }}>✦</span>
          <div style={{ width: 6, height: 6, border: '1px solid #d4a23740', transform: 'rotate(45deg)' }} />
          <span style={{ color: '#d4a23740', fontSize: 8 }}>✦</span>
          <div style={{ width: 1, height: 50, background: 'linear-gradient(180deg, #d4a23740, transparent)' }} />
        </div>

        {/* Left side edge accent dots */}
        <div style={{ position: 'absolute', left: 32, top: '30%', width: 3, height: 3, borderRadius: '50%', background: '#d4a23730' }} />
        <div style={{ position: 'absolute', left: 32, top: '70%', width: 3, height: 3, borderRadius: '50%', background: '#d4a23730' }} />
        <div style={{ position: 'absolute', right: 32, top: '30%', width: 3, height: 3, borderRadius: '50%', background: '#d4a23730' }} />
        <div style={{ position: 'absolute', right: 32, top: '70%', width: 3, height: 3, borderRadius: '50%', background: '#d4a23730' }} />

        {/* Outer gold border */}
        <div style={{ border: '3px solid #d4a237', padding: '5px', height: '100%' }}>
          {/* Inner gold border */}
          <div
            style={{
              border: '1.5px solid #d4a23770',
              padding: '32px 52px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              minHeight: 500,
              position: 'relative',
            }}
          >
            {/* Top ornamental row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 30, height: 1, background: 'linear-gradient(90deg, transparent, #d4a23750)' }} />
              <span style={{ color: '#d4a23760', fontSize: 7 }}>✦</span>
              <span style={{ color: '#d4a23780', fontSize: 9 }}>✦</span>
              <span style={{ color: '#d4a237', fontSize: 13 }}>★</span>
              <span style={{ color: '#d4a23780', fontSize: 9 }}>✦</span>
              <span style={{ color: '#d4a23760', fontSize: 7 }}>✦</span>
              <div style={{ width: 30, height: 1, background: 'linear-gradient(90deg, #d4a23750, transparent)' }} />
            </div>

            {/* Academy Name */}
            <p style={{ color: '#d4a237', fontSize: 14, letterSpacing: '0.45em', textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 2 }}>
              AI · DS Academy
            </p>

            {/* Title */}
            <h1 style={{ fontSize: 44, fontWeight: 700, color: '#d4a237', fontStyle: 'italic', marginBottom: 0, lineHeight: 1.2, textShadow: '0 2px 12px rgba(212,162,55,0.2)' }}>
              Certificate of Recognition
            </h1>

            {/* Ornate divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px auto 12px' }}>
              <div style={{ width: 50, height: 1, background: 'linear-gradient(90deg, transparent, #d4a237)' }} />
              <div style={{ width: 6, height: 6, border: '1.5px solid #d4a237', transform: 'rotate(45deg)' }} />
              <div style={{ width: 16, height: 1, background: '#d4a237' }} />
              <div style={{ width: 6, height: 6, border: '1.5px solid #d4a237', transform: 'rotate(45deg)' }} />
              <div style={{ width: 50, height: 1, background: 'linear-gradient(90deg, #d4a237, transparent)' }} />
            </div>

            {/* Presented to */}
            <p style={{ color: '#d4a23799', fontSize: 14, fontStyle: 'italic', marginBottom: 8 }}>
              This is proudly presented to
            </p>

            {/* Student Name */}
            <h2 style={{ fontSize: 40, fontWeight: 700, color: '#f0e6d0', marginBottom: 2, fontStyle: 'italic', textShadow: '0 2px 10px rgba(240,230,208,0.12)', letterSpacing: '0.05em' }}>
              {studentName}
            </h2>

            {/* Name underline - ornate */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              <div style={{ width: 80, height: 2, background: 'linear-gradient(90deg, transparent, #d4a237)' }} />
              <div style={{ width: 4, height: 4, background: '#d4a237', borderRadius: '50%' }} />
              <div style={{ width: 80, height: 2, background: 'linear-gradient(90deg, #d4a237, transparent)' }} />
            </div>

            {/* "for the successful completion of" */}
            <p style={{ color: '#d4a23790', fontSize: 13, fontStyle: 'italic', marginBottom: 6 }}>
              for the successful completion of
            </p>

            {/* Course Name - prominent */}
            <div style={{ border: '1px solid #d4a23730', borderRadius: 6, padding: '8px 28px', marginBottom: 14, background: 'rgba(212,162,55,0.03)' }}>
              <h3 style={{ fontSize: 28, fontWeight: 700, color: '#d4a237', fontFamily: 'sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.3, margin: 0, textShadow: '0 1px 6px rgba(212,162,55,0.15)' }}>
                {courseName}
              </h3>
            </div>

            {/* Recognition text - richer */}
            <p style={{ color: '#d4a23775', fontSize: 12, fontStyle: 'italic', marginBottom: 14, maxWidth: 460, lineHeight: 1.7 }}>
              In recognition of outstanding performance, dedication, and successful completion of all course modules and assessments conducted by AI·DS Academy
            </p>

            {/* Badge row with side ornaments - full width */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 0, marginBottom: 14 }}>
              {/* Left side ornament chain */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg, transparent, #d4a23740)' }} />
                <span style={{ color: '#d4a23745', fontSize: 7 }}>✦</span>
                <div style={{ width: 14, height: 1, background: '#d4a23740' }} />
                <div style={{ width: 5, height: 5, border: '1px solid #d4a23745', transform: 'rotate(45deg)' }} />
                <div style={{ width: 14, height: 1, background: '#d4a23740' }} />
                <span style={{ color: '#d4a23745', fontSize: 7 }}>✦</span>
                <div style={{ width: 20, height: 1, background: '#d4a23750' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid #d4a23750' }} />
                <div style={{ width: 12, height: 1, background: '#d4a23750' }} />
              </div>

              {/* Badge - center */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1.5px solid #d4a23755', borderRadius: 50, padding: '8px 24px', background: 'rgba(212,162,55,0.04)', margin: '0 10px', flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>🏆</span>
                <span style={{ color: '#e8a532', fontSize: 15, fontWeight: 700, fontFamily: 'sans-serif' }}>Course Completed</span>
              </div>

              {/* Right side ornament chain */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-start' }}>
                <div style={{ width: 12, height: 1, background: '#d4a23750' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid #d4a23750' }} />
                <div style={{ width: 20, height: 1, background: '#d4a23750' }} />
                <span style={{ color: '#d4a23745', fontSize: 7 }}>✦</span>
                <div style={{ width: 14, height: 1, background: '#d4a23740' }} />
                <div style={{ width: 5, height: 5, border: '1px solid #d4a23745', transform: 'rotate(45deg)' }} />
                <div style={{ width: 14, height: 1, background: '#d4a23740' }} />
                <span style={{ color: '#d4a23745', fontSize: 7 }}>✦</span>
                <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg, #d4a23740, transparent)' }} />
              </div>
            </div>

            {/* Date issued row with side lines */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 4 }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #d4a23725)' }} />
              <p style={{ color: '#d4a23780', fontSize: 12, margin: '0 16px', whiteSpace: 'nowrap' }}>
                Issued on <strong style={{ color: '#e8dcc8', fontWeight: 600 }}>{fullDate}</strong>
              </p>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #d4a23725, transparent)' }} />
            </div>

            {/* Certificate ID row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 4 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <div style={{ width: 30, height: 1, background: 'linear-gradient(90deg, transparent, #d4a23720)' }} />
                <span style={{ color: '#d4a23730', fontSize: 6 }}>◆</span>
                <div style={{ width: 30, height: 1, background: '#d4a23720' }} />
              </div>
              <p style={{ color: '#d4a23755', fontSize: 10, fontFamily: 'monospace', margin: '0 14px', whiteSpace: 'nowrap' }}>
                Certificate ID: {certificateNo.toUpperCase()}
              </p>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
                <div style={{ width: 30, height: 1, background: '#d4a23720' }} />
                <span style={{ color: '#d4a23730', fontSize: 6 }}>◆</span>
                <div style={{ width: 30, height: 1, background: 'linear-gradient(90deg, #d4a23720, transparent)' }} />
              </div>
            </div>

            {/* Verification URL row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #d4a23718)' }} />
              <p style={{ color: '#d4a23740', fontSize: 9, fontFamily: 'monospace', margin: '0 14px', whiteSpace: 'nowrap' }}>
                Verify at: {origin ? verifyUrl : `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${certificateNo}`}
              </p>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #d4a23718, transparent)' }} />
            </div>

            {/* Bottom ornate divider - full width */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, width: '100%' }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #d4a23730)' }} />
              <span style={{ color: '#d4a23745', fontSize: 6 }}>✦</span>
              <div style={{ width: 16, height: 1, background: '#d4a23740' }} />
              <span style={{ color: '#d4a23760', fontSize: 8 }}>◆</span>
              <div style={{ width: 16, height: 1, background: '#d4a23740' }} />
              <span style={{ color: '#d4a23745', fontSize: 6 }}>✦</span>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #d4a23730, transparent)' }} />
            </div>

            {/* Footer row: full width with ornament lines */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 'auto' }}>
              {/* Left ornament line */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg, transparent, #d4a23730)' }} />
                <span style={{ color: '#d4a23735', fontSize: 5 }}>✦</span>
                <div style={{ width: 16, height: 1, background: '#d4a23730' }} />
                <div style={{ width: 4, height: 4, border: '0.5px solid #d4a23735', transform: 'rotate(45deg)' }} />
                <div style={{ width: 16, height: 1, background: '#d4a23730' }} />
              </div>

              {/* Left text */}
              <div style={{ textAlign: 'center', margin: '0 14px' }}>
                <p style={{ color: '#d4a23750', fontSize: 9, fontFamily: 'sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 1 }}>Digitally</p>
                <p style={{ color: '#d4a23750', fontSize: 9, fontFamily: 'sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Verified</p>
              </div>

              {/* Center logo */}
              <div style={{ textAlign: 'center', margin: '0 8px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #d4a237, #b8902f)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', boxShadow: '0 3px 12px rgba(212,162,55,0.35), 0 0 0 3px rgba(212,162,55,0.1)' }}>
                  <span style={{ fontSize: 22 }}>🏅</span>
                </div>
                <p style={{ color: '#d4a237', fontSize: 10, fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: '0.15em' }}>AI·DS</p>
              </div>

              {/* Right text */}
              <div style={{ textAlign: 'center', margin: '0 14px' }}>
                <p style={{ color: '#d4a23750', fontSize: 9, fontFamily: 'sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 1 }}>AI·DS</p>
                <p style={{ color: '#d4a23750', fontSize: 9, fontFamily: 'sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Academy</p>
              </div>

              {/* Right ornament line */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
                <div style={{ width: 16, height: 1, background: '#d4a23730' }} />
                <div style={{ width: 4, height: 4, border: '0.5px solid #d4a23735', transform: 'rotate(45deg)' }} />
                <div style={{ width: 16, height: 1, background: '#d4a23730' }} />
                <span style={{ color: '#d4a23735', fontSize: 5 }}>✦</span>
                <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg, #d4a23730, transparent)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Status badge */}
      {status === 'VERIFIED' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/25 text-green-300 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-medium">Verified by AI·DS Academy</span>
          <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-green-400/60 hover:text-green-300">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
      {status === 'PENDING' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
          <Clock className="w-4 h-4" />
          <span className="font-medium">Pending admin verification</span>
        </div>
      )}
      {status === 'REVOKED' && (
        <div className="flex flex-col gap-1 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span className="font-medium">Certificate Revoked</span>
          </div>
          {revokedReason && <p className="text-xs text-red-400/60 pl-6">Reason: {revokedReason}</p>}
        </div>
      )}

      {/* Download button — only when verified */}
      {status === 'VERIFIED' ? (
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          {downloading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
          ) : (
            <><Download className="w-4 h-4" /> Download Certificate (PDF)</>
          )}
        </button>
      ) : (
        <div className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-center text-white/30 text-sm">
          Download available after admin verification
        </div>
      )}
    </div>
  )
}

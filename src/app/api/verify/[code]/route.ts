import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const cert = await prisma.certificate.findUnique({
    where: { certificateNo: params.code },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true, category: true } },
    },
  })

  if (!cert) {
    return NextResponse.json({ valid: false, error: 'Certificate not found' }, { status: 404 })
  }

  return NextResponse.json({
    valid: cert.status !== 'REVOKED',
    status: cert.status,
    studentName: cert.user.name,
    courseName: cert.course.title,
    courseCategory: cert.course.category,
    issuedAt: cert.issuedAt,
    certificateNo: cert.certificateNo,
    revokedReason: cert.revokedReason ?? null,
  })
}

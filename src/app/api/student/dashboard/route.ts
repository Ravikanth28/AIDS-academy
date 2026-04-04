import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

// GET: Single endpoint that returns everything the student dashboard needs
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const userId = session!.userId

  // Fetch enrollments and certificates in parallel
  const [enrollments, certificates] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { order: 'asc' },
              include: {
                _count: { select: { videos: true, questions: true } },
              },
            },
          },
        },
        moduleProgress: true,
      },
    }),
    prisma.certificate.findMany({
      where: { userId },
      include: {
        course: { select: { id: true, title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    }),
  ])

  return NextResponse.json({ enrollments, certificates })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const certificates = await prisma.certificate.findMany({
    where: { userId: session!.userId },
    include: {
      course: {
        include: {
          modules: { orderBy: { order: 'asc' } },
        },
      },
      user: { select: { name: true, phone: true } },
    },
    orderBy: { issuedAt: 'desc' },
  })
  return NextResponse.json(certificates)
}

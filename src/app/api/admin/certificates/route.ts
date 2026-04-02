import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const certs = await prisma.certificate.findMany({
    include: {
      user: { select: { id: true, name: true, phone: true } },
      course: { select: { id: true, title: true, category: true } },
    },
    orderBy: { issuedAt: 'desc' },
  })

  return NextResponse.json(certs)
}

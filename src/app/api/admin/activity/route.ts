import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const userId = searchParams.get('userId') ?? undefined
  const action = searchParams.get('action') ?? undefined

  const where: Record<string, unknown> = {}
  if (userId) where.userId = userId
  if (action) where.action = action

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, limit })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))

  const rows = await prisma.monthlyPoints.findMany({
    where: { month, year, user: { role: 'STUDENT' } },
    orderBy: { points: 'desc' },
    include: {
      user: { select: { id: true, name: true, phone: true } },
    },
  })

  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }))

  return NextResponse.json({ month, year, leaderboard: ranked })
}

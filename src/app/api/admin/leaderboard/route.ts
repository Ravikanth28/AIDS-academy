import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin(req)
  if (error) return error

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

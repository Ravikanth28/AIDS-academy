import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))

  const rows = await prisma.monthlyPoints.findMany({
    where: { month, year, user: { role: 'STUDENT' } },
    orderBy: { points: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
    },
    take: 20,
  })

  const ranked = rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: r.user.name,
    points: r.points,
    isMe: r.userId === session.userId,
  }))

  // Also return current user's position even if outside top 20
  const myEntry = await prisma.monthlyPoints.findUnique({
    where: { userId_month_year: { userId: session.userId, month, year } },
  })
  const allSorted = await prisma.monthlyPoints.count({
    where: { month, year, user: { role: 'STUDENT' }, points: { gte: myEntry?.points ?? 0 } },
  })

  return NextResponse.json({
    month,
    year,
    leaderboard: ranked,
    myRank: myEntry ? allSorted : null,
    myPoints: myEntry?.points ?? 0,
    totalParticipants: await prisma.monthlyPoints.count({ where: { month, year, user: { role: 'STUDENT' } } }),
  })
}

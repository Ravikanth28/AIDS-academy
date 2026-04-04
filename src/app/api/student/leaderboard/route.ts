import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))

  // Run all queries in parallel
  const [rows, myEntry, totalParticipants] = await Promise.all([
    prisma.monthlyPoints.findMany({
      where: { month, year, user: { role: 'STUDENT' } },
      orderBy: { points: 'desc' },
      include: { user: { select: { id: true, name: true } } },
      take: 20,
    }),
    prisma.monthlyPoints.findUnique({
      where: { userId_month_year: { userId: session.userId, month, year } },
    }),
    prisma.monthlyPoints.count({ where: { month, year, user: { role: 'STUDENT' } } }),
  ])

  const ranked = rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: r.user.name,
    points: r.points,
    isMe: r.userId === session.userId,
  }))

  // Compute user's rank — check top 20 first to avoid extra DB query
  const myTopEntry = ranked.find(r => r.userId === session.userId)
  let myRank: number | null = null
  if (myEntry) {
    if (myTopEntry) {
      myRank = myTopEntry.rank
    } else {
      // Outside top 20 — count people with strictly more points
      const above = await prisma.monthlyPoints.count({
        where: { month, year, user: { role: 'STUDENT' }, points: { gt: myEntry.points } },
      })
      myRank = above + 1
    }
  }

  return NextResponse.json({
    month,
    year,
    leaderboard: ranked,
    myRank,
    myPoints: myEntry?.points ?? 0,
    totalParticipants,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

// Single endpoint combining stats + recent activity + leaderboard
// Replaces 3 separate admin dashboard fetches
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [
    totalCourses,
    totalModules,
    totalStudents,
    totalCertificates,
    recentStudents,
    courseEnrollData,
    activityLogs,
    leaderboardRows,
  ] = await Promise.all([
    prisma.course.count(),
    prisma.module.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.certificate.count(),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, phone: true, createdAt: true },
    }),
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        _count: { select: { enrollments: true, modules: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.activityLog.findMany({
      where: { user: { role: 'STUDENT' } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { user: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.monthlyPoints.findMany({
      where: { month, year, user: { role: 'STUDENT' } },
      orderBy: { points: 'desc' },
      take: 5,
      include: { user: { select: { id: true, name: true, phone: true } } },
    }),
  ])

  const courseEnrollChart = [...courseEnrollData]
    .sort((a, b) => b._count.enrollments - a._count.enrollments)
    .slice(0, 6)
    .map((c) => ({
      name: c.title.length > 16 ? c.title.slice(0, 14) + '…' : c.title,
      students: c._count.enrollments,
    }))

  const catMap = courseEnrollData.reduce(
    (acc, c) => {
      acc[c.category ?? 'Other'] = (acc[c.category ?? 'Other'] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const categoryPie = Object.entries(catMap).map(([name, value]) => ({ name, value }))

  const leaderboard = leaderboardRows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: r.user.name,
    phone: r.user.phone,
    points: r.points,
  }))

  return NextResponse.json({
    stats: {
      totalCourses,
      totalModules,
      totalStudents,
      totalCertificates,
      recentStudents,
      courseEnrollChart,
      categoryPie,
    },
    activity: { logs: activityLogs },
    leaderboard: { month, year, leaderboard },
  })
}

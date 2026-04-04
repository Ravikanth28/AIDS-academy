import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req)
  if (error) return error

  // Run all aggregation queries in parallel
  const [
    totalCourses,
    totalModules,
    totalStudents,
    totalCertificates,
    recentStudents,
    courseEnrollData,
    now,
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
    Promise.resolve(new Date()),
  ])

  const courseEnrollChart = [...courseEnrollData]
    .sort((a, b) => b._count.enrollments - a._count.enrollments)
    .slice(0, 6)
    .map(c => ({
      name: c.title.length > 16 ? c.title.slice(0, 14) + '…' : c.title,
      students: c._count.enrollments,
    }))

  const catMap = courseEnrollData.reduce((acc, c) => {
    acc[c.category ?? 'Other'] = (acc[c.category ?? 'Other'] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const categoryPie = Object.entries(catMap).map(([name, value]) => ({ name, value }))

  return NextResponse.json({
    totalCourses,
    totalModules,
    totalStudents,
    totalCertificates,
    recentStudents,
    courseEnrollChart,
    categoryPie,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

// GET all published courses (for students to browse/enroll)
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req)
  if (error) return error

  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        select: { id: true, title: true, order: true },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(courses)
}

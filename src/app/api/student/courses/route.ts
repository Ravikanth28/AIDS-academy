import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

// GET all published courses (for students to browse/enroll)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const include = {
    modules: {
      orderBy: { order: 'asc' } as const,
      select: {
        id: true,
        title: true,
        order: true,
        _count: { select: { videos: true, questions: true } },
      },
    },
    _count: { select: { enrollments: true } },
  }

  const [publicCourses, assignedCourseIds] = await Promise.all([
    // All public (non-assigned-only) published courses
    prisma.course.findMany({
      where: { isPublished: true, isAssignedOnly: false },
      include,
      orderBy: { createdAt: 'desc' },
    }),
    // Courses assigned specifically to this student
    prisma.courseAssignment.findMany({
      where: {
        userId: session!.userId,
        course: { isPublished: true, isAssignedOnly: true },
      },
      select: { courseId: true },
    }),
  ])

  const assignedCourses = assignedCourseIds.length > 0
    ? await prisma.course.findMany({
        where: { id: { in: assignedCourseIds.map(a => a.courseId) } },
        include,
        orderBy: { createdAt: 'desc' },
      })
    : []

  // Merge, avoiding duplicates
  const publicIds = new Set(publicCourses.map(c => c.id))
  const merged = [...publicCourses, ...assignedCourses.filter(c => !publicIds.has(c.id))]
  return NextResponse.json(merged)
}

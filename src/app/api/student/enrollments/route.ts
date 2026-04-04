import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { logActivity, POINTS } from '@/lib/points'

// GET enrolled courses for the student
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session!.userId },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { order: 'asc' },
            include: {
              _count: { select: { videos: true, questions: true } },
            },
          },
        },
      },
      moduleProgress: true,
    },
  })
  return NextResponse.json(enrollments)
}

// POST: Enroll in a course
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const { courseId } = await req.json()
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { isAssignedOnly: true, isPublished: true } })
  if (!course || !course.isPublished) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (course.isAssignedOnly) return NextResponse.json({ error: 'This course is by admin assignment only' }, { status: 403 })

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session!.userId, courseId } },
  })
  if (existing) return NextResponse.json({ error: 'Already enrolled' }, { status: 409 })

  const enrollment = await prisma.enrollment.create({
    data: { userId: session!.userId, courseId },
    include: { course: true },
  })
  await logActivity(session!.userId, 'ENROLLED', `Enrolled in ${enrollment.course.title}`, POINTS.ENROLLED).catch(() => {})
  return NextResponse.json(enrollment, { status: 201 })
}

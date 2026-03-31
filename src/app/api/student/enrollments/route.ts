import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

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

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session!.userId, courseId } },
  })
  if (existing) return NextResponse.json({ error: 'Already enrolled' }, { status: 409 })

  const enrollment = await prisma.enrollment.create({
    data: { userId: session!.userId, courseId },
    include: { course: true },
  })
  return NextResponse.json(enrollment, { status: 201 })
}

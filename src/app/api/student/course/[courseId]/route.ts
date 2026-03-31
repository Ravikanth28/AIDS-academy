import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

// GET course details with modules and student's progress
export async function GET(req: NextRequest, { params }: { params: { courseId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId: session!.userId, courseId: params.courseId },
    },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { order: 'asc' },
            include: {
              videos: { orderBy: { order: 'asc' } },
              _count: { select: { questions: true } },
            },
          },
        },
      },
      moduleProgress: {
        include: { module: true },
      },
    },
  })

  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })
  return NextResponse.json(enrollment)
}

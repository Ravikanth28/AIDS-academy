import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          videos: { orderBy: { order: 'asc' } },
          _count: { select: { questions: true } },
        },
      },
    },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  return NextResponse.json(course)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const body = await req.json()
  const course = await prisma.course.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description,
      category: body.category,
      thumbnail: body.thumbnail,
      isPublished: body.isPublished,
      // Reset isAssignedOnly when unpublishing so re-publish starts fresh
      ...(body.isPublished === false ? { isAssignedOnly: false } : {}),
    },
  })
  return NextResponse.json(course)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const courseId = params.id

  await prisma.$transaction(async (tx) => {
    // Delete module progress for all enrollments of this course
    const enrollments = await tx.enrollment.findMany({ where: { courseId }, select: { id: true } })
    const enrollmentIds = enrollments.map((e) => e.id)
    if (enrollmentIds.length > 0) {
      await tx.moduleProgress.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } })
    }

    // Delete enrollments
    await tx.enrollment.deleteMany({ where: { courseId } })

    // Delete certificates
    await tx.certificate.deleteMany({ where: { courseId } })

    // Delete test answers & attempts for modules of this course
    const modules = await tx.module.findMany({ where: { courseId }, select: { id: true } })
    const moduleIds = modules.map((m) => m.id)
    if (moduleIds.length > 0) {
      const testAttempts = await tx.testAttempt.findMany({ where: { moduleId: { in: moduleIds } }, select: { id: true } })
      const attemptIds = testAttempts.map((a) => a.id)
      if (attemptIds.length > 0) {
        await tx.testAnswer.deleteMany({ where: { testAttemptId: { in: attemptIds } } })
      }
      await tx.testAttempt.deleteMany({ where: { moduleId: { in: moduleIds } } })
    }

    // Delete the course (modules, videos, questions, options cascade via schema)
    await tx.course.delete({ where: { id: courseId } })
  })

  return NextResponse.json({ message: 'Course deleted' })
}

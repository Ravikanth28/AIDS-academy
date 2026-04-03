import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

// POST: Publish course (everyone or specific students)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { mode, studentIds } = await req.json()
  // mode: 'everyone' | 'specific'
  // studentIds: string[] (only used when mode === 'specific')

  const courseId = params.id

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  if (mode === 'everyone') {
    // Simply publish the course — students can browse & self-enroll
    await prisma.course.update({
      where: { id: courseId },
      data: { isPublished: true },
    })
    return NextResponse.json({ message: 'Course published for everyone' })
  }

  if (mode === 'specific') {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one student' }, { status: 400 })
    }

    // Publish the course (visible only to those enrolled; browseable too)
    await prisma.course.update({
      where: { id: courseId },
      data: { isPublished: true },
    })

    // Auto-enroll each selected student (skip if already enrolled)
    const modules = await prisma.module.findMany({
      where: { courseId },
      select: { id: true },
    })

    await Promise.all(
      studentIds.map(async (userId: string) => {
        // upsert enrollment
        const enrollment = await prisma.enrollment.upsert({
          where: { userId_courseId: { userId, courseId } },
          update: {},
          create: { userId, courseId },
        })
        // create missing ModuleProgress rows
        await Promise.all(
          modules.map(m =>
            prisma.moduleProgress.upsert({
              where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: m.id } },
              update: {},
              create: { enrollmentId: enrollment.id, moduleId: m.id },
            })
          )
        )
      })
    )

    return NextResponse.json({ message: `Course assigned to ${studentIds.length} student(s)` })
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

// GET: return all students + who is already assigned to this course
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const courseId = params.id

  const [course, students, assignments] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { id: true, isAssignedOnly: true } }),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.courseAssignment.findMany({
      where: { courseId },
      select: { userId: true },
    }),
  ])

  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const assignedIds = assignments.map(a => a.userId)
  return NextResponse.json({ students, assignedIds, isAssignedOnly: course.isAssignedOnly })
}

// POST: Assign course — everyone or individual students
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { mode, studentIds } = await req.json()
  // mode: 'everyone' | 'individual'
  // studentIds: string[] (only used when mode === 'individual')

  const courseId = params.id

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  if (mode === 'everyone') {
    // Clear all individual assignments and make course public
    await prisma.$transaction([
      prisma.courseAssignment.deleteMany({ where: { courseId } }),
      prisma.course.update({
        where: { id: courseId },
        data: { isPublished: true, isAssignedOnly: false },
      }),
    ])
    return NextResponse.json({ message: 'Course is now visible to everyone' })
  }

  if (mode === 'individual') {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one student' }, { status: 400 })
    }

    // Mark course as assigned-only
    await prisma.course.update({
      where: { id: courseId },
      data: { isPublished: true, isAssignedOnly: true },
    })

    // Replace assignments: delete old ones not in new list, add new ones
    await prisma.courseAssignment.deleteMany({ where: { courseId } })
    await prisma.courseAssignment.createMany({
      data: studentIds.map((userId: string) => ({ courseId, userId })),
      skipDuplicates: true,
    })

    // Auto-enroll each assigned student so they can start learning immediately
    const modules = await prisma.module.findMany({
      where: { courseId },
      select: { id: true },
    })

    await Promise.all(
      studentIds.map(async (userId: string) => {
        const enrollment = await prisma.enrollment.upsert({
          where: { userId_courseId: { userId, courseId } },
          update: {},
          create: { userId, courseId },
        })
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

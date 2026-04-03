import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

// GET all courses
export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin(req)
  if (error) return error

  const courses = await prisma.course.findMany({
    include: {
      modules: { orderBy: { order: 'asc' }, include: { _count: { select: { videos: true, questions: true } } } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(courses)
}

// POST create course
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(req)
  if (error) return error

  const body = await req.json()
  const { title, description, category, thumbnail, moduleCount, moduleNames } = body

  if (!title || !description || !moduleCount || moduleCount < 1) {
    return NextResponse.json({ error: 'Title, description, and module count required' }, { status: 400 })
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      category: category || 'AI & Data Science',
      thumbnail,
      modules: {
        create: Array.from({ length: moduleCount }, (_, i) => ({
          title: (Array.isArray(moduleNames) && moduleNames[i]) ? moduleNames[i] : `Module ${i + 1}`,
          description: '',
          order: i + 1,
          passingScore: 60,
          questionCount: 10,
        })),
      },
    },
    include: { modules: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json(course, { status: 201 })
}

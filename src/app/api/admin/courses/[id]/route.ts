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
    },
  })
  return NextResponse.json(course)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  await prisma.course.delete({ where: { id: params.id } })
  return NextResponse.json({ message: 'Course deleted' })
}

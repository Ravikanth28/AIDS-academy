import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const body = await req.json()
  const module_ = await prisma.module.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description,
      passingScore: body.passingScore,
      questionCount: body.questionCount,
    },
  })
  return NextResponse.json(module_)
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const module_ = await prisma.module.findUnique({
    where: { id: params.id },
    include: {
      videos: { orderBy: { order: 'asc' } },
      questions: {
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  return NextResponse.json(module_)
}

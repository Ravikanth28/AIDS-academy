import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

// POST: Add questions to a module (manual or bulk, optionally with videoId/timestamp for checkpoints)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const body = await req.json()
  const { questions } = body
  // questions: [{ text, explanation, options: [{ text, isCorrect, order }], videoId?, timestamp? }]

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'Questions array required' }, { status: 400 })
  }

  const module_ = await prisma.module.findUnique({ where: { id: params.id } })
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const created = await prisma.$transaction(
    questions.map((q) =>
      prisma.question.create({
        data: {
          text: q.text,
          moduleId: params.id,
          explanation: q.explanation || '',
          videoId: q.videoId || null,
          timestamp: q.timestamp != null ? parseInt(q.timestamp) : null,
          options: {
            create: q.options.map((o: { text: string; isCorrect: boolean }, i: number) => ({
              text: o.text,
              isCorrect: Boolean(o.isCorrect),
              order: i,
            })),
          },
        },
        include: { options: true },
      })
    )
  )

  return NextResponse.json(created, { status: 201 })
}

// GET: Get all questions for a module (optionally filter by videoId for checkpoints)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const videoId = searchParams.get('videoId')

  const where: Record<string, unknown> = { moduleId: params.id }
  if (videoId) {
    where.videoId = videoId
    where.timestamp = { not: null }
  }

  const questions = await prisma.question.findMany({
    where,
    include: { options: { orderBy: { order: 'asc' } }, video: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(questions)
}

// DELETE: Delete a question by questionId in body
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { questionId } = await req.json()
  if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 })

  await prisma.question.delete({ where: { id: questionId } })
  return NextResponse.json({ message: 'Question deleted' })
}

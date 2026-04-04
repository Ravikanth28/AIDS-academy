import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

// GET: Fetch all coding questions for a module
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const questions = await prisma.codingQuestion.findMany({
    where: { moduleId: params.id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(questions)
}

// POST: Create a new coding question
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const body = await req.json()
  const { type = 'coding', difficulty = 'medium', mode = 'both', title, description, examples = [], constraints = '', starterCode = '', hints = [], sampleSolution = '', sqlSchema = '', expectedOutput = '', order = 0 } = body

  if (!title || !description) {
    return NextResponse.json({ error: 'title and description are required' }, { status: 400 })
  }

  const module_ = await prisma.module.findUnique({ where: { id: params.id } })
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const question = await prisma.codingQuestion.create({
    data: { moduleId: params.id, type, difficulty, mode, title, description, examples: JSON.stringify(examples), constraints, starterCode, hints: JSON.stringify(hints), sampleSolution, sqlSchema: sqlSchema || null, expectedOutput, order },
  })

  return NextResponse.json(question)
}

// DELETE: Remove a coding question
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { questionId } = await req.json()
  if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 })

  await prisma.codingQuestion.delete({ where: { id: questionId } })
  return NextResponse.json({ success: true })
}

// PUT: Update a coding question
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const body = await req.json()
  const { questionId, ...data } = body
  if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 })

  if (data.examples !== undefined) data.examples = JSON.stringify(data.examples)
  if (data.hints !== undefined) data.hints = JSON.stringify(data.hints)

  const updated = await prisma.codingQuestion.update({ where: { id: questionId }, data })
  return NextResponse.json(updated)
}
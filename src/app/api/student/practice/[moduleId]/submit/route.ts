import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

// POST: Save a practice attempt
export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const body = await req.json()
  const { totalMcq, correctMcq, exercisesCompleted, totalExercises } = body

  if (typeof totalMcq !== 'number' || typeof correctMcq !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const module_ = await prisma.module.findUnique({ where: { id: params.moduleId } })
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const mcqScore = totalMcq > 0 ? Math.round((correctMcq / totalMcq) * 100) : 0
  const exerciseScore = (totalExercises ?? 0) > 0
    ? Math.round(((exercisesCompleted ?? 0) / (totalExercises as number)) * 100)
    : 100
  const overallScore = Math.round((mcqScore + exerciseScore) / 2)

  const attempt = await prisma.practiceAttempt.create({
    data: {
      userId: session!.userId,
      moduleId: params.moduleId,
      mcqScore,
      totalMcq,
      correctMcq,
      exercisesCompleted: exercisesCompleted ?? 0,
      totalExercises: totalExercises ?? 0,
      overallScore,
    },
  })

  return NextResponse.json({ attempt, mcqScore, overallScore })
}

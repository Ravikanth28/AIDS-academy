import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { shuffleArray } from '@/lib/utils'

// GET: Get shuffled test questions for a module
export async function GET(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const module_ = await prisma.module.findUnique({
    where: { id: params.moduleId },
    include: {
      questions: {
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  // Check if module progress allows test (videos completed)
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: session!.userId, course: { modules: { some: { id: params.moduleId } } } },
  })
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  const progress = await prisma.moduleProgress.findUnique({
    where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: params.moduleId } },
  })

  if (!progress?.videoCompleted) {
    return NextResponse.json({ error: 'Complete all videos before taking the test' }, { status: 403 })
  }

  // Shuffle questions and limit by questionCount
  let questions = shuffleArray(module_.questions)
  questions = questions.slice(0, module_.questionCount)

  // Shuffle options for each question, hide correct answer indicator
  const sanitized = questions.map((q: any) => ({
    id: q.id,
    text: q.text,
    options: shuffleArray(q.options).map((o: any) => ({
      id: o.id,
      text: o.text,
    })),
  }))

  return NextResponse.json({
    moduleId: params.moduleId,
    moduleTitle: module_.title,
    passingScore: module_.passingScore,
    questions: sanitized,
  })
}

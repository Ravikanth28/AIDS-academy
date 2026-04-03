import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { logActivity, POINTS } from '@/lib/points'

// POST: Submit test answers
export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const { answers, courseId } = await req.json()
  // answers: [{ questionId, selectedOptionId }]

  if (!answers || !Array.isArray(answers) || !courseId) {
    return NextResponse.json({ error: 'answers and courseId required' }, { status: 400 })
  }

  const module_ = await prisma.module.findUnique({
    where: { id: params.moduleId },
    include: {
      questions: {
        include: { options: true },
      },
    },
  })
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session!.userId, courseId } },
  })
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  // Grade answers
  let correctCount = 0
  const gradedAnswers = answers.map((a: { questionId: string; selectedOptionId: string }) => {
    const question = module_.questions.find((q: any) => q.id === a.questionId)
    if (!question) return { ...a, isCorrect: false }
    const correctOption = (question as any).options.find((o: any) => o.isCorrect)
    const isCorrect = correctOption?.id === a.selectedOptionId
    if (isCorrect) correctCount++
    return { ...a, isCorrect, correctOptionId: correctOption?.id }
  })

  const total = answers.length
  const score = total > 0 ? (correctCount / total) * 100 : 0
  const passed = score >= module_.passingScore

  // Save test attempt
  const attempt = await prisma.testAttempt.create({
    data: {
      userId: session!.userId,
      moduleId: params.moduleId,
      score,
      totalQuestions: total,
      correctAnswers: correctCount,
      passed,
      answers: {
        create: answers.map((a: { questionId: string; selectedOptionId: string }) => {
          const graded = gradedAnswers.find((g) => g.questionId === a.questionId)
          return {
            questionId: a.questionId,
            selectedOptionId: a.selectedOptionId,
            isCorrect: graded?.isCorrect ?? false,
          }
        }),
      },
    },
  })

  // If passed, update module progress
  if (passed) {
    const existing = await prisma.moduleProgress.findUnique({
      where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: params.moduleId } },
    })
    // Only award points if this is the FIRST time passing this module
    const alreadyPassed = existing?.testPassed === true
    if (existing) {
      await prisma.moduleProgress.update({
        where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: params.moduleId } },
        data: { testPassed: true, testScore: score, completedAt: new Date() },
      })
    } else {
      await prisma.moduleProgress.create({
        data: {
          enrollmentId: enrollment.id,
          moduleId: params.moduleId,
          testPassed: true,
          testScore: score,
          videoCompleted: true,
          completedAt: new Date(),
        },
      })
    }

    if (!alreadyPassed) {
      await logActivity(session!.userId, 'TEST_PASSED', `Passed test for module in course`, POINTS.TEST_PASSED).catch(() => {})
    }

    const courseModules = await prisma.module.findMany({
      where: { courseId },
      select: { id: true },
    })
    const allProgress = await prisma.moduleProgress.findMany({
      where: { enrollmentId: enrollment.id },
    })
    const allPassed = courseModules.every((m: any) =>
      allProgress.some((p: any) => p.moduleId === m.id && p.testPassed && p.videoCompleted)
    )

    if (allPassed) {
      // Issue certificate if not already issued
      const cert = await prisma.certificate.upsert({
        where: { userId_courseId: { userId: session!.userId, courseId } },
        update: {},
        create: { userId: session!.userId, courseId },
      })
      if (cert) {
        await logActivity(session!.userId, 'CERTIFICATE_EARNED', `Earned certificate for course`, POINTS.CERTIFICATE_EARNED).catch(() => {})
      }
    }
  }

  // Return results with correct answers
  const detailedResults = answers.map((a: { questionId: string; selectedOptionId: string }) => {
    const question = module_.questions.find((q: any) => q.id === a.questionId)
    const correctOption = (question as any)?.options.find((o: any) => o.isCorrect)
    const graded = gradedAnswers.find((g) => g.questionId === a.questionId)
    return {
      questionId: a.questionId,
      questionText: question?.text,
      selectedOptionId: a.selectedOptionId,
      correctOptionId: correctOption?.id,
      correctOptionText: correctOption?.text,
      isCorrect: graded?.isCorrect ?? false,
      explanation: question?.explanation,
    }
  })

  // Find next module in the course
  const allCourseModules = await prisma.module.findMany({
    where: { courseId },
    select: { id: true, order: true },
    orderBy: { order: 'asc' },
  })
  const currentModuleIndex = allCourseModules.findIndex((m: any) => m.id === params.moduleId)
  const nextModule = currentModuleIndex >= 0 && currentModuleIndex < allCourseModules.length - 1
    ? allCourseModules[currentModuleIndex + 1]
    : null

  return NextResponse.json({
    score,
    correctAnswers: correctCount,
    totalQuestions: total,
    passed,
    passingScore: module_.passingScore,
    results: detailedResults,
    certificateEarned: passed && (await checkCertificate(session!.userId, courseId)),
    nextModuleId: passed && nextModule ? nextModule.id : null,
  })
}

async function checkCertificate(userId: string, courseId: string) {
  const cert = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  return !!cert
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { logActivity, POINTS } from '@/lib/points'

type QuestionWithOptions = {
  id: string
  text: string
  explanation: string | null
  options: Array<{ id: string; text: string; isCorrect: boolean }>
}

type Answer = { questionId: string; selectedOptionId: string }

// POST: Submit test answers
export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const { answers, courseId } = await req.json()
  // answers: [{ questionId, selectedOptionId }]

  if (!answers || !Array.isArray(answers) || !courseId) {
    return NextResponse.json({ error: 'answers and courseId required' }, { status: 400 })
  }

  // Fetch module and enrollment in parallel
  const [module_, enrollment] = await Promise.all([
    prisma.module.findUnique({
      where: { id: params.moduleId },
      include: { questions: { include: { options: true } } },
    }),
    prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session!.userId, courseId } },
    }),
  ])
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  const questions = module_.questions as QuestionWithOptions[]

  // Grade answers
  let correctCount = 0
  const gradedAnswers = (answers as Answer[]).map((a) => {
    const question = questions.find((q) => q.id === a.questionId)
    if (!question) return { ...a, isCorrect: false, correctOptionId: undefined }
    const correctOption = question.options.find((o) => o.isCorrect)
    const isCorrect = correctOption?.id === a.selectedOptionId
    if (isCorrect) correctCount++
    return { ...a, isCorrect, correctOptionId: correctOption?.id }
  })

  const total = answers.length
  const score = total > 0 ? (correctCount / total) * 100 : 0
  const passed = score >= module_.passingScore

  // Create test attempt + fetch course modules in parallel
  const [, allCourseModules] = await Promise.all([
    prisma.testAttempt.create({
      data: {
        userId: session!.userId,
        moduleId: params.moduleId,
        score,
        totalQuestions: total,
        correctAnswers: correctCount,
        passed,
        answers: {
          create: (answers as Answer[]).map((a) => {
            const graded = gradedAnswers.find((g) => g.questionId === a.questionId)
            return {
              questionId: a.questionId,
              selectedOptionId: a.selectedOptionId,
              isCorrect: graded?.isCorrect ?? false,
            }
          }),
        },
      },
    }),
    prisma.module.findMany({
      where: { courseId },
      select: { id: true, order: true },
      orderBy: { order: 'asc' },
    }),
  ])

  let certificateEarned = false

  // If passed, update module progress
  if (passed) {
    const existing = await prisma.moduleProgress.findUnique({
      where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: params.moduleId } },
    })
    // Only award points if this is the FIRST time passing this module
    const alreadyPassed = existing?.testPassed === true

    // Update/create moduleProgress first, then fetch all progress
    await (existing
      ? prisma.moduleProgress.update({
          where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: params.moduleId } },
          data: { testPassed: true, testScore: score, videoCompleted: true, completedAt: new Date() },
        })
      : prisma.moduleProgress.create({
          data: {
            enrollmentId: enrollment.id,
            moduleId: params.moduleId,
            testPassed: true,
            testScore: score,
            videoCompleted: true,
            completedAt: new Date(),
          },
        }))

    const allProgress = await prisma.moduleProgress.findMany({
      where: { enrollmentId: enrollment.id },
    })

    if (!alreadyPassed) {
      logActivity(session!.userId, 'TEST_PASSED', `Passed test for module in course`, POINTS.TEST_PASSED).catch(() => {})
    }

    const allPassed = allCourseModules.every((m) =>
      allProgress.some((p) => p.moduleId === m.id && p.testPassed && p.videoCompleted),
    )

    if (allPassed) {
      // Check if certificate already issued
      const existingCert = await prisma.certificate.findUnique({
        where: { userId_courseId: { userId: session!.userId, courseId } },
      })

      if (!existingCert) {
        // Generate human-readable certificate number: CERT-YYYY-NNNNN
        const certCount = await prisma.certificate.count()
        const year = new Date().getFullYear()
        const certificateNo = `CERT-${year}-${String(certCount + 1).padStart(5, '0')}`

        await prisma.certificate.create({
          data: {
            userId: session!.userId,
            courseId,
            certificateNo,
            status: 'PENDING',
          },
        })
        certificateEarned = true
        logActivity(session!.userId, 'CERTIFICATE_EARNED', `Earned certificate for course`, POINTS.CERTIFICATE_EARNED).catch(() => {})
      }
    }
  }

  // Return results with correct answers
  const detailedResults = (answers as Answer[]).map((a) => {
    const question = questions.find((q) => q.id === a.questionId)
    const correctOption = question?.options.find((o) => o.isCorrect)
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

  // Find next module — reuse the already-fetched allCourseModules
  const currentModuleIndex = allCourseModules.findIndex((m) => m.id === params.moduleId)
  const nextModule =
    currentModuleIndex >= 0 && currentModuleIndex < allCourseModules.length - 1
      ? allCourseModules[currentModuleIndex + 1]
      : null

  return NextResponse.json({
    score,
    correctAnswers: correctCount,
    totalQuestions: total,
    passed,
    passingScore: module_.passingScore,
    results: detailedResults,
    certificateEarned: passed && certificateEarned,
    nextModuleId: passed && nextModule ? nextModule.id : null,
  })
}


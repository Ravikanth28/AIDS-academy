import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { getTranscript, transcriptToText } from '@/lib/youtube'
import { chatCompletion } from '@/lib/ai'

// POST: Generate or retrieve practice content (MCQs + coding exercises)
export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const module_ = await prisma.module.findUnique({
    where: { id: params.moduleId },
    include: { videos: { orderBy: { order: 'asc' } } },
  })
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  // Verify enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: session!.userId, course: { modules: { some: { id: params.moduleId } } } },
  })
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  // Require videos to be completed
  const progress = await prisma.moduleProgress.findUnique({
    where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: params.moduleId } },
  })
  if (!progress?.videoCompleted) {
    return NextResponse.json({ error: 'Complete all videos before accessing practice mode' }, { status: 403 })
  }

  // Check for admin-created coding questions for practice mode
  const storedCodingQs = await prisma.codingQuestion.findMany({
    where: { moduleId: params.moduleId, mode: { in: ['practice', 'both'] } },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  // Parse stored questions if available
  let exercises: unknown[] = []
  if (storedCodingQs.length > 0) {
    exercises = storedCodingQs.map(q => ({
      id: q.id,
      type: q.type,
      difficulty: q.difficulty,
      title: q.title,
      description: q.description,
      starterCode: q.starterCode,
      hints: (() => { try { return JSON.parse(q.hints) } catch { return [] } })(),
      sampleSolution: q.sampleSolution,
      source: 'admin',
    }))
  }

  // Gather transcripts for MCQ generation
  const transcriptResults = await Promise.all(
    module_.videos.map(async (video) => {
      try {
        const segments = await getTranscript(video.youtubeUrl)
        const text = transcriptToText(segments)
        return text ? `Video: ${video.title}\n${text}` : null
      } catch {
        return null
      }
    }),
  )
  const transcripts = transcriptResults.filter((t): t is string => t !== null)

  const body = await req.json().catch(() => ({}))
  const mcqCount = Math.min(Math.max(body.mcqCount || 4, 3), 5)
  const exerciseCount = Math.min(Math.max(body.exerciseCount || 2, 1), 2)

  // Generate MCQs from AI if transcripts available
  let mcqs: unknown[] = []
  if (transcripts.length > 0) {
    const combined = transcripts.join('\n\n---\n\n')
    const trimmed = combined.length > 12000 ? combined.slice(0, 12000) + '...[truncated]' : combined

    const mcqSystemPrompt = `You are an expert educator. Generate multiple-choice quiz questions from video transcripts.
Return ONLY valid JSON array. Each question must have exactly 4 options with exactly 1 correct answer.
Format:
[
  {
    "id": "1",
    "difficulty": "easy|medium|hard",
    "text": "Question text?",
    "hint": "conceptual hint without revealing answer",
    "explanation": "explanation of correct answer",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ]
  }
]
Rules: Difficulty must progress easy→medium→hard. Use only facts from the transcript.`

    const mcqUserPrompt = `Generate ${mcqCount} MCQs for module "${module_.title}":\n\n${trimmed}`

    try {
      const response = await chatCompletion(mcqSystemPrompt, mcqUserPrompt, { temperature: 0.4, maxTokens: 3000 })
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) mcqs = JSON.parse(jsonMatch[0])
    } catch { /* silent — return empty mcqs */ }
  }

  // If no stored exercises, generate with AI
  if (exercises.length === 0 && transcripts.length > 0) {
    const combined = transcripts.join('\n\n---\n\n')
    const trimmed = combined.length > 12000 ? combined.slice(0, 12000) + '...[truncated]' : combined

    const exSystemPrompt = `You are an expert educator. Generate coding/SQL exercises from video transcripts.
Return ONLY valid JSON array:
[
  {
    "id": "1",
    "type": "coding|sql",
    "difficulty": "easy|medium|hard",
    "title": "short title",
    "description": "full problem description",
    "starterCode": "starter code template",
    "hints": ["hint 1", "hint 2"],
    "sampleSolution": "complete working solution"
  }
]
Rules: difficulty easy→hard. Type based on module content (coding for Python/JS, sql for database topics).`

    const exUserPrompt = `Generate ${exerciseCount} coding/SQL exercises for module "${module_.title}":\n\n${trimmed}`

    try {
      const response = await chatCompletion(exSystemPrompt, exUserPrompt, { temperature: 0.4, maxTokens: 3000 })
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) exercises = JSON.parse(jsonMatch[0])
    } catch { /* silent */ }
  }

  if (mcqs.length === 0 && exercises.length === 0) {
    return NextResponse.json({ error: 'No transcripts or stored questions available for this module' }, { status: 400 })
  }

  return NextResponse.json({ mcqs, exercises, moduleTitle: module_.title })
}

// GET: Fetch attempt history for this module
export async function GET(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId: session!.userId, moduleId: params.moduleId },
    orderBy: { completedAt: 'desc' },
    take: 5,
  })

  return NextResponse.json({ attempts })
}

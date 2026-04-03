import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { getTranscript, transcriptToText } from '@/lib/youtube'
import { chatCompletion } from '@/lib/ai'

// POST: Retrieve or generate coding/SQL test problems
export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const module_ = await prisma.module.findUnique({
    where: { id: params.moduleId },
    include: { videos: { orderBy: { order: 'asc' } } },
  })
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  // Verify enrollment and video completion
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: session!.userId, course: { modules: { some: { id: params.moduleId } } } },
  })
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  const progress = await prisma.moduleProgress.findUnique({
    where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: params.moduleId } },
  })
  if (!progress?.videoCompleted) {
    return NextResponse.json({ error: 'Complete all videos before taking the coding test' }, { status: 403 })
  }

  // Check for admin-created test problems
  const storedQs = await prisma.codingQuestion.findMany({
    where: { moduleId: params.moduleId, mode: { in: ['test', 'both'] } },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  if (storedQs.length > 0) {
    // Use stored questions — strip hints and solutions for test mode
    const problems = storedQs.map(q => ({
      id: q.id,
      type: q.type,
      difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
      title: q.title,
      description: q.description,
      examples: (() => { try { return JSON.parse(q.examples) } catch { return [] } })(),
      constraints: q.constraints || '',
      starterCode: q.starterCode,
      // No hints, no solution in test mode
    }))
    return NextResponse.json({ problems, moduleTitle: module_.title, source: 'admin' })
  }

  // Fall back to AI generation from transcripts
  const transcripts: string[] = []
  for (const video of module_.videos) {
    try {
      const segments = await getTranscript(video.youtubeUrl)
      const text = transcriptToText(segments)
      if (text) transcripts.push(`Video: ${video.title}\n${text}`)
    } catch {
      // skip
    }
  }

  if (transcripts.length === 0) {
    return NextResponse.json({ error: 'No stored questions or video transcripts available for this module' }, { status: 400 })
  }

  const combined = transcripts.join('\n\n---\n\n')
  const trimmed = combined.length > 12000 ? combined.slice(0, 12000) + '...[truncated]' : combined

  const body = await req.json().catch(() => ({}))
  const count = Math.min(Math.max(body.count || 3, 2), 3)

  const systemPrompt = `You are an expert coding interview designer for a programming/data science course.
Return ONLY valid JSON matching this exact schema:
{
  "problems": [
    {
      "id": "string (1,2,3...)",
      "type": "coding|sql",
      "difficulty": "easy|medium|hard",
      "title": "short problem title",
      "description": "full problem statement with clear requirements and expected output",
      "examples": [
        {"input": "...", "output": "..."}
      ],
      "constraints": "time/space complexity expectations or SQL constraints",
      "starterCode": "function/query skeleton for candidate to fill in"
    }
  ]
}
Rules:
- First problem: easy, second: medium, third: hard (difficulty progression)
- Problems must be directly relevant to the module transcript topic
- Type: use "coding" for Python/JavaScript problems, "sql" for database problems
- No hints — this is a test`

  const userPrompt = `Generate ${count} coding/SQL test problems for module: "${module_.title}"\n\n${trimmed}`

  try {
    const response = await chatCompletion(systemPrompt, userPrompt, { temperature: 0.3, maxTokens: 4096 })
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })

    const content = JSON.parse(jsonMatch[0])
    return NextResponse.json({ ...content, moduleTitle: module_.title, source: 'ai' })
  } catch (err) {
    console.error('Coding test generation error:', err)
    return NextResponse.json({ error: 'Failed to generate coding test' }, { status: 500 })
  }
}

// GET: Fetch coding attempt history
export async function GET(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const attempts = await prisma.codingAttempt.findMany({
    where: { userId: session!.userId, moduleId: params.moduleId },
    orderBy: { completedAt: 'desc' },
    take: 5,
  })

  return NextResponse.json({ attempts })
}

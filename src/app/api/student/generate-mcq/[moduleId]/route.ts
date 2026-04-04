import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { getTranscript, transcriptToText } from '@/lib/youtube'
import { chatCompletion } from '@/lib/ai'
import { getCached, setCached } from '@/lib/cache'

// POST: Generate MCQ questions from module video transcripts
export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { error } = await requireAuth(req)
  if (error) return error

  try {
    const module_ = await prisma.module.findUnique({
      where: { id: params.moduleId },
      include: { videos: { orderBy: { order: 'asc' } } },
    })
    if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

    if (module_.videos.length === 0) {
      return NextResponse.json({ error: 'No videos in this module' }, { status: 400 })
    }

    // Gather transcripts from all videos in parallel
    const transcriptResults = await Promise.all(
      module_.videos.map(async (video) => {
        try {
          const segments = await getTranscript(video.youtubeUrl)
          const text = transcriptToText(segments)
          return text ? `Video: ${video.title}\n${text}` : null
        } catch (err) {
          console.warn(`Could not fetch transcript for ${video.title}:`, err)
          return null
        }
      })
    )
    const transcripts = transcriptResults.filter((t): t is string => t !== null)
    const transcriptCount = transcripts.length

    if (transcriptCount === 0) {
      return NextResponse.json({
        error: 'No YouTube transcript/subtitles are available for this module, so AI quiz generation cannot run.',
      }, { status: 400 })
    }

    const combinedTranscript = transcripts.join('\n\n---\n\n')

    // Truncate if too long
    const maxChars = 12000
    const trimmed = combinedTranscript.length > maxChars
      ? combinedTranscript.slice(0, maxChars) + '...[truncated]'
      : combinedTranscript

    const body = await req.json().catch(() => ({}))
    const count = Math.min(Math.max(body.count || 5, 1), 20)

    // Return cached result if available (1 hour TTL)
    const cacheKey = `mcq:${params.moduleId}:${count}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))

    const systemPrompt = `You are an expert educator. Generate multiple-choice quiz questions from video lecture transcripts. 
Return ONLY valid JSON array. Each question must have exactly 4 options with exactly 1 correct answer.
Format:
[
  {
    "text": "Question text?",
    "explanation": "Brief explanation of the correct answer",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ]
  }
]`

    const userPrompt = `Generate ${count} multiple-choice questions strictly from these lecture transcripts for the module "${module_.title}".

Use only facts that are explicitly present in the transcript text below.
If the transcript does not contain enough information for a question, do not invent content.

${trimmed}`

    const response = await chatCompletion(systemPrompt, userPrompt, { temperature: 0.5 })

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const questions = JSON.parse(jsonMatch[0])
    const result = { questions, moduleTitle: module_.title }
    setCached(cacheKey, JSON.stringify(result))
    return NextResponse.json(result)
  } catch (err) {
    console.error('Generate MCQ error:', err)
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }
}

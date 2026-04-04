import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { getTranscript, transcriptToText } from '@/lib/youtube'
import { chatCompletion } from '@/lib/ai'
import { getCached, setCached } from '@/lib/cache'

// POST: Generate downloadable notes from module video transcripts
export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { error } = await requireAuth(req)
  if (error) return error

  try {
    const module_ = await prisma.module.findUnique({
      where: { id: params.moduleId },
      include: {
        videos: { orderBy: { order: 'asc' } },
        course: { select: { title: true } },
      },
    })
    if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

    if (module_.videos.length === 0) {
      return NextResponse.json({ error: 'No videos in this module' }, { status: 400 })
    }

    // Return cached result if available (1 hour TTL)
    const cacheKey = `notes:${params.moduleId}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))

    // Gather transcripts in parallel
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
        error: 'No YouTube transcript/subtitles are available for this module, so AI notes cannot be generated.',
      }, { status: 400 })
    }

    const combinedTranscript = transcripts.join('\n\n---\n\n')
    const maxChars = 12000
    const trimmed = combinedTranscript.length > maxChars
      ? combinedTranscript.slice(0, maxChars) + '...[truncated]'
      : combinedTranscript

    const systemPrompt = `You are an expert educator. Create comprehensive, well-structured study notes from video lecture transcripts.
The notes should be in clean Markdown format with:
- A title and overview
- Key concepts with explanations
- Important definitions and terms
- Summary points
- Key takeaways
Make the notes student-friendly, clear, and easy to review for exams.`

    const userPrompt = `Create detailed study notes for the module "${module_.title}" (Course: ${module_.course.title}).

Base the notes strictly on the transcript text below.
Do not infer or invent topics from the module title or course title alone.

Video transcripts:
${trimmed}`

    const notes = await chatCompletion(systemPrompt, userPrompt, { maxTokens: 4096, temperature: 0.4 })

    const result = {
      notes,
      moduleTitle: module_.title,
      courseTitle: module_.course.title,
    }
    setCached(cacheKey, JSON.stringify(result))
    return NextResponse.json(result)
  } catch (err) {
    console.error('Generate notes error:', err)
    return NextResponse.json({ error: 'Failed to generate notes' }, { status: 500 })
  }
}

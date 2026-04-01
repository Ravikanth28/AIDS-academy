import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { getTranscript, transcriptToText } from '@/lib/youtube'
import { chatCompletion } from '@/lib/ai'

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

    // Gather transcripts
    const transcripts: string[] = []
    for (const video of module_.videos) {
      try {
        const segments = await getTranscript(video.youtubeUrl)
        transcripts.push(`Video: ${video.title}\n${transcriptToText(segments)}`)
      } catch (err) {
        console.warn(`Could not fetch transcript for ${video.title}:`, err)
        transcripts.push(`Video: ${video.title}\n[Transcript unavailable]`)
      }
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

Video transcripts:
${trimmed}`

    const notes = await chatCompletion(systemPrompt, userPrompt, { maxTokens: 4096, temperature: 0.4 })

    return NextResponse.json({
      notes,
      moduleTitle: module_.title,
      courseTitle: module_.course.title,
    })
  } catch (err) {
    console.error('Generate notes error:', err)
    return NextResponse.json({ error: 'Failed to generate notes' }, { status: 500 })
  }
}

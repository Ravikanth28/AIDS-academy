import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { getTranscript, transcriptToText } from '@/lib/youtube'
import { chatCompletion } from '@/lib/ai'

// POST: Generate mind map data from module video transcripts
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

    // Gather transcripts
    let topicContext = `Module: ${module_.title}\nCourse: ${module_.course.title}`
    if (module_.description) topicContext += `\nDescription: ${module_.description}`

    for (const video of module_.videos) {
      try {
        const segments = await getTranscript(video.youtubeUrl)
        const text = transcriptToText(segments)
        topicContext += `\n\nVideo "${video.title}":\n${text.slice(0, 2000)}`
      } catch {
        // skip
      }
    }

    const maxChars = 10000
    const trimmed = topicContext.length > maxChars
      ? topicContext.slice(0, maxChars) + '...[truncated]'
      : topicContext

    const systemPrompt = `You are an expert educator. Create a mind map structure from video lecture content.
Return ONLY valid JSON with this exact structure:
{
  "central": "Main Topic Name",
  "branches": [
    {
      "label": "Branch 1 Name",
      "children": [
        {"label": "Sub-topic 1"},
        {"label": "Sub-topic 2", "children": [{"label": "Detail 1"}, {"label": "Detail 2"}]}
      ]
    }
  ]
}

Rules:
- The central node is the main module topic
- Create 4-6 main branches representing key themes
- Each branch should have 2-5 children
- Important children can have 1-3 sub-children
- Keep labels concise (3-8 words max)
- Cover all major concepts from the transcripts
- Organize logically from fundamentals to advanced topics`

    const userPrompt = `Generate a comprehensive mind map for:\n\n${trimmed}`

    const response = await chatCompletion(systemPrompt, userPrompt, { temperature: 0.3 })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const mindmap = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      mindmap,
      moduleTitle: module_.title,
    })
  } catch (err) {
    console.error('Mind map error:', err)
    return NextResponse.json({ error: 'Failed to generate mind map' }, { status: 500 })
  }
}

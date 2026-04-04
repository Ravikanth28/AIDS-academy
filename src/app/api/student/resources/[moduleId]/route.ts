import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { getTranscript, transcriptToText } from '@/lib/youtube'
import { chatCompletion } from '@/lib/ai'
import { getCached, setCached } from '@/lib/cache'

// POST: AI finds relevant learning resources for a module
export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { error } = await requireAuth(req)
  if (error) return error

  try {
    const module_ = await prisma.module.findUnique({
      where: { id: params.moduleId },
      include: {
        videos: { orderBy: { order: 'asc' } },
        course: { select: { title: true, category: true } },
      },
    })
    if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

    // Return cached result if available (1 hour TTL)
    const cacheKey = `resources:${params.moduleId}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))

    // Try to get transcript context for better recommendations — fetch in parallel
    const transcriptResults = await Promise.all(
      module_.videos.slice(0, 2).map(async (video) => {
        try {
          const segments = await getTranscript(video.youtubeUrl)
          const text = transcriptToText(segments)
          return text ? `\nVideo "${video.title}" covers: ${text.slice(0, 500)}` : null
        } catch {
          return null
        }
      })
    )
    const validTranscripts = transcriptResults.filter((t): t is string => t !== null)
    const topicContext = validTranscripts.join('')
    const transcriptCount = validTranscripts.length

    if (transcriptCount === 0) {
      return NextResponse.json({
        error: 'No YouTube transcript/subtitles are available for this module, so AI resource recommendations cannot be generated reliably.',
      }, { status: 400 })
    }

    const systemPrompt = `You are an AI learning assistant. Based on the module topic and context, recommend relevant free learning resources.
Return ONLY valid JSON with this exact structure:
{
  "resources": [
    {
      "type": "pdf|notebook|dataset|slides|github|article|tutorial",
      "title": "Resource title",
      "url": "https://actual-real-url.com",
      "description": "Brief description of what this resource covers",
      "source": "e.g. GitHub, Kaggle, ArXiv, Google Colab, etc."
    }
  ]
}

IMPORTANT:
- Only suggest REAL, well-known, publicly accessible resources that are very likely to exist
- For GitHub: suggest popular repos related to the topic (e.g. github.com/jakevdp/PythonDataScienceHandbook)
- For datasets: suggest Kaggle datasets, UCI ML repos, or HuggingFace datasets
- For notebooks: suggest Google Colab notebooks or Kaggle notebooks
- For articles: suggest towards data science, medium articles, or official documentation
- For PDFs: suggest ArXiv papers, course PDFs from universities
- Aim for 6-10 diverse resources across different types
- Focus on beginner to intermediate level resources`

    const userPrompt = `Find relevant learning resources strictly based on this transcript-derived topic context.

Do not infer the topic from the module or course name alone.

${topicContext}`

    const response = await chatCompletion(systemPrompt, userPrompt, { temperature: 0.3 })

    // Extract JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const data = JSON.parse(jsonMatch[0])

    // Validate URLs: keep only entries where URL starts with https:// and looks well-formed
    const validatedResources = (data.resources ?? []).filter((r: { url?: string }) => {
      if (!r.url || typeof r.url !== 'string') return false
      try {
        const url = new URL(r.url)
        return url.protocol === 'https:'
      } catch {
        return false
      }
    })

    const result = {
      resources: validatedResources,
      moduleTitle: module_.title,
      courseTitle: module_.course.title,
      disclaimer: 'These resources are AI-suggested. Links are filtered for HTTPS but not individually verified — some may be unavailable.',
    }
    setCached(cacheKey, JSON.stringify(result))
    return NextResponse.json(result)
  } catch (err) {
    console.error('Resource finder error:', err)
    return NextResponse.json({ error: 'Failed to find resources' }, { status: 500 })
  }
}

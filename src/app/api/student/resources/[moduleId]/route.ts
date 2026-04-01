import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { getTranscript, transcriptToText } from '@/lib/youtube'
import { chatCompletion } from '@/lib/ai'

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

    // Try to get transcript context for better recommendations
    let topicContext = `Module: ${module_.title}\nCourse: ${module_.course.title}\nCategory: ${module_.course.category || 'AI & Data Science'}`
    if (module_.description) topicContext += `\nDescription: ${module_.description}`

    for (const video of module_.videos.slice(0, 2)) {
      try {
        const segments = await getTranscript(video.youtubeUrl)
        const text = transcriptToText(segments)
        topicContext += `\nVideo "${video.title}" covers: ${text.slice(0, 500)}`
      } catch {
        // skip silently
      }
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

    const userPrompt = `Find relevant learning resources for this module:\n\n${topicContext}`

    const response = await chatCompletion(systemPrompt, userPrompt, { temperature: 0.3 })

    // Extract JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      resources: data.resources || [],
      moduleTitle: module_.title,
      courseTitle: module_.course.title,
    })
  } catch (err) {
    console.error('Resource finder error:', err)
    return NextResponse.json({ error: 'Failed to find resources' }, { status: 500 })
  }
}

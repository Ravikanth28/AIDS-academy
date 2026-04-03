import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'
import { chatCompletion } from '@/lib/ai'

interface ProblemSubmission {
  problemId: string
  title: string
  type: string
  difficulty: string
  description: string
  solution: string
}

// POST: Evaluate coding/SQL submissions with AI and save attempt
export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const body = await req.json()
  const { submissions }: { submissions: ProblemSubmission[] } = body

  if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
    return NextResponse.json({ error: 'submissions array required' }, { status: 400 })
  }

  const module_ = await prisma.module.findUnique({ where: { id: params.moduleId } })
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const systemPrompt = `You are a strict but fair code evaluator for a programming/data science course.
Evaluate each submitted solution and return ONLY valid JSON matching this exact schema:
{
  "evaluations": [
    {
      "problemId": "string",
      "score": number (0-100),
      "passed": boolean (true if score >= 60),
      "correctness": "brief assessment of logical correctness",
      "efficiency": "brief assessment of time/space complexity or query efficiency",
      "feedback": "specific, actionable feedback pointing out issues or praise",
      "betterApproach": "optional: suggest a better approach if score < 80, else null"
    }
  ],
  "totalScore": number (average of all scores, rounded),
  "overallFeedback": "brief summary of performance across all problems"
}
Scoring guide:
- 90-100: Completely correct, efficient, clean code
- 70-89: Correct but minor inefficiencies or style issues
- 50-69: Partially correct, core logic present but bugs or missing cases
- 30-49: Attempt made but significant logical errors
- 0-29: Incomplete or completely wrong`

  const problemsList = submissions.map((s, i) =>
    `Problem ${i + 1} [${s.difficulty.toUpperCase()}] (${s.type}) — ${s.title}:
Description: ${s.description}
---
Submitted Solution:
${s.solution || '(no solution submitted)'}
`
  ).join('\n\n')

  const userPrompt = `Evaluate these ${submissions.length} submissions for module "${module_.title}":

${problemsList}`

  try {
    const response = await chatCompletion(systemPrompt, userPrompt, { temperature: 0.2, maxTokens: 3000 })
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse evaluation' }, { status: 500 })

    const evaluation = JSON.parse(jsonMatch[0])
    const totalScore = evaluation.totalScore ?? 0
    const passed = totalScore >= 60

    // Save coding attempt
    const attempt = await prisma.codingAttempt.create({
      data: {
        userId: session!.userId,
        moduleId: params.moduleId,
        score: totalScore,
        totalProblems: submissions.length,
        passed,
        feedback: JSON.stringify(evaluation),
      },
    })

    return NextResponse.json({ ...evaluation, passed, attemptId: attempt.id })
  } catch (err) {
    console.error('Coding evaluation error:', err)
    return NextResponse.json({ error: 'Failed to evaluate submissions' }, { status: 500 })
  }
}

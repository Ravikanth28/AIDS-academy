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
  language: string
  examples: Array<{ input: string; output: string }>
  sqlSchema?: string
  expectedOutput?: string
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

  const systemPrompt = `You are a fair and generous code evaluator for a programming course. Your job is to reward correct logic.

Evaluate each solution and return ONLY valid JSON:
{
  "evaluations": [
    {
      "problemId": "string",
      "score": number (0-100),
      "passed": boolean (true if score >= 60),
      "correctness": "one sentence on correctness",
      "efficiency": "one sentence on efficiency",
      "feedback": "helpful feedback",
      "betterApproach": null or "suggestion only if score < 70"
    }
  ],
  "totalScore": number (average, rounded),
  "overallFeedback": "brief overall summary"
}

SCORING (apply strictly):
- 90-100: Logic is correct and computes the right answer for all examples
- 75-89: Logic is mostly correct, trivial style issues only
- 50-74: Partially correct — has the right idea but output is wrong in some cases
- 25-49: Wrong logic for most cases
- 0-24: Blank, completely unrelated, or nonsensical code

CRITICAL RULES — you MUST follow these:
1. This platform runs code via stdin/stdout. input() in Python and scanf in C are the CORRECT way to read values. Do NOT penalise for using input().
2. Do NOT require function definitions (def/class). Procedural scripts using input() are 100% valid and correct.
3. Do NOT require error handling, input validation, or type checking unless the problem explicitly asks for it.
4. The "examples" field shows LOGICAL input values and expected output. Use them to TRACE through the student's code mentally and verify the logic produces the right answer.
5. If the code correctly reads inputs and computes the right result → score MUST be 90+.
6. Never give 0 unless the code is completely blank or prints a hardcoded unrelated answer.`

  const problemsList = submissions.map((s, i) => {
    const isSql = s.type === 'sql'
    if (isSql) {
      return `Problem ${i + 1} [${s.difficulty.toUpperCase()}] (SQL) — ${s.title}
Description: ${s.description}
Schema:
${s.sqlSchema || '(no schema provided)'}
Expected Output (JSON): ${s.expectedOutput || '(not specified)'}
---
Student's SQL Query:
${s.solution || '(no solution submitted)'}`
    }
    const examplesText = s.examples?.length
      ? s.examples.map((ex, j) => `  Example ${j + 1}: Input: ${ex.input} → Expected Output: ${ex.output}`).join('\n')
      : '  (no examples provided)'
    return `Problem ${i + 1} [${s.difficulty.toUpperCase()}] (${s.type}) — ${s.title}
Language: ${s.language}
Description: ${s.description}
Expected examples:
${examplesText}
---
Submitted Solution (${s.language}):
${s.solution || '(no solution submitted)'}`
  }).join('\n\n')

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

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Loader2, Sparkles, CheckCircle, XCircle, Lightbulb,
  Code2, Database, ChevronDown, ChevronUp, Trophy, RotateCcw,
  BookOpen, Target, BarChart3, Send
} from 'lucide-react'

interface MCQ {
  id: string
  difficulty: 'easy' | 'medium' | 'hard'
  text: string
  hint: string
  explanation: string
  options: Array<{ text: string; isCorrect: boolean }>
}

interface Exercise {
  id: string
  type: 'coding' | 'sql'
  difficulty: 'easy' | 'medium' | 'hard'
  title: string
  description: string
  starterCode: string
  hints: string[]
  sampleSolution: string
}

interface PracticeContent {
  moduleTitle: string
  mcqs: MCQ[]
  exercises: Exercise[]
}

const DIFFICULTY_COLORS = {
  easy: 'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  hard: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default function PracticeModePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId as string
  const moduleId = params?.moduleId as string

  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState<PracticeContent | null>(null)

  // MCQ state
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({})
  const [revealedHints, setRevealedHints] = useState<Set<string>>(new Set())
  const [mcqSubmitted, setMcqSubmitted] = useState(false)

  // Exercise state
  const [exerciseCodes, setExerciseCodes] = useState<Record<string, string>>({})
  const [shownHints, setShownHints] = useState<Record<string, number>>({}) // exerciseId -> hint index revealed up to
  const [shownSolutions, setShownSolutions] = useState<Set<string>>(new Set())

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ mcqScore: number; overallScore: number } | null>(null)

  useEffect(() => {
    generateContent()
  }, [moduleId])

  async function generateContent() {
    setLoading(true)
    setContent(null)
    setMcqAnswers({})
    setRevealedHints(new Set())
    setMcqSubmitted(false)
    setExerciseCodes({})
    setShownHints({})
    setShownSolutions(new Set())
    setSubmitted(false)
    setResult(null)

    try {
      const res = await fetch(`/api/student/practice/${moduleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcqCount: 4, exerciseCount: 2 }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to generate practice content')
        router.push(`/dashboard/courses/${courseId}`)
        return
      }
      setContent(data)
      // Pre-fill exercise starter code
      const codes: Record<string, string> = {}
      for (const ex of data.exercises ?? []) {
        codes[ex.id] = ex.starterCode || ''
      }
      setExerciseCodes(codes)
    } catch {
      toast.error('Could not load practice content')
      router.push(`/dashboard/courses/${courseId}`)
    } finally {
      setLoading(false)
    }
  }

  function selectMcqAnswer(mcqId: string, optionIndex: number) {
    if (mcqSubmitted) return
    setMcqAnswers(prev => ({ ...prev, [mcqId]: optionIndex }))
  }

  function toggleHint(mcqId: string) {
    setRevealedHints(prev => {
      const next = new Set(prev)
      if (next.has(mcqId)) next.delete(mcqId)
      else next.add(mcqId)
      return next
    })
  }

  function getMcqScore(): { correct: number; total: number } {
    if (!content) return { correct: 0, total: 0 }
    let correct = 0
    for (const q of content.mcqs) {
      const selectedIdx = mcqAnswers[q.id]
      if (selectedIdx !== undefined && q.options[selectedIdx]?.isCorrect) correct++
    }
    return { correct, total: content.mcqs.length }
  }

  function revealNextHint(exerciseId: string, maxHints: number) {
    setShownHints(prev => {
      const current = prev[exerciseId] ?? -1
      return { ...prev, [exerciseId]: Math.min(current + 1, maxHints - 1) }
    })
  }

  function toggleSolution(exerciseId: string) {
    setShownSolutions(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) next.delete(exerciseId)
      else next.add(exerciseId)
      return next
    })
  }

  async function handleSubmit() {
    if (!content) return
    const { correct, total } = getMcqScore()
    const exercisesCompleted = content.exercises.filter(ex =>
      (exerciseCodes[ex.id] || '').trim().length > 5
    ).length

    setSubmitting(true)
    try {
      const res = await fetch(`/api/student/practice/${moduleId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalMcq: total,
          correctMcq: correct,
          exercisesCompleted,
          totalExercises: content.exercises.length,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({ mcqScore: data.mcqScore, overallScore: data.overallScore })
      setSubmitted(true)
      setMcqSubmitted(true)
      toast.success('Practice session saved!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save attempt')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
      <p className="text-white/40 text-sm">Generating practice content...</p>
    </div>
  )

  if (!content) return null

  const { correct: mcqCorrect, total: mcqTotal } = getMcqScore()
  const allMcqAnswered = Object.keys(mcqAnswers).length === mcqTotal
  const exercisesAttempted = content.exercises.filter(ex =>
    (exerciseCodes[ex.id] || '').trim().length > 5
  ).length

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/courses/${courseId}`} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/50" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="badge-purple px-3 py-1 text-xs font-medium flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> Practice Mode
            </span>
          </div>
          <h1 className="font-display text-xl font-bold mt-1 truncate">{content.moduleTitle}</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {mcqTotal} conceptual questions &bull; {content.exercises.length} hands-on exercises
          </p>
        </div>
        <button
          onClick={generateContent}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/40 hover:text-white/70"
          title="Regenerate practice"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Result Banner */}
      {submitted && result && (
        <div className="glass-card border border-purple-500/30 bg-purple-500/10 p-5 mb-6 flex items-center gap-4">
          <Trophy className="w-8 h-8 text-purple-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-purple-200">Practice Complete!</p>
            <p className="text-sm text-white/50 mt-0.5">
              MCQ Score: <span className="text-purple-300 font-medium">{result.mcqScore}%</span>
              &ensp;&bull;&ensp;
              Overall: <span className="text-purple-300 font-medium">{result.overallScore}%</span>
            </p>
          </div>
          <Link href={`/dashboard/courses/${courseId}`} className="btn-secondary text-sm py-2">
            Back to Course
          </Link>
        </div>
      )}

      {/* Progress Tracker */}
      {!submitted && (
        <div className="glass-card border border-white/5 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-white/50">MCQs answered:</span>
              <span className={`font-medium ${allMcqAnswered ? 'text-green-400' : 'text-white/70'}`}>
                {Object.keys(mcqAnswers).length}/{mcqTotal}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="text-white/50">Exercises attempted:</span>
              <span className="font-medium text-white/70">{exercisesAttempted}/{content.exercises.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 1: MCQs ===== */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <span className="text-purple-400 text-xs font-bold">1</span>
          </div>
          <h2 className="font-display font-semibold text-base">Conceptual Questions</h2>
          {mcqSubmitted && (
            <span className="ml-auto text-sm text-white/50">
              {mcqCorrect}/{mcqTotal} correct &mdash; {Math.round((mcqCorrect / mcqTotal) * 100)}%
            </span>
          )}
        </div>

        <div className="space-y-5">
          {content.mcqs.map((q, qi) => {
            const selectedIdx = mcqAnswers[q.id]
            const hintShown = revealedHints.has(q.id)
            const correctIdx = q.options.findIndex(o => o.isCorrect)

            return (
              <div key={q.id} className="glass-card border border-white/5 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium flex-1">
                    <span className="text-white/30 mr-2">{qi + 1}.</span>
                    {q.text}
                  </p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${DIFFICULTY_COLORS[q.difficulty]}`}>
                    {q.difficulty}
                  </span>
                </div>

                <div className="space-y-1.5 ml-4">
                  {q.options.map((opt, oi) => {
                    let cls = 'bg-white/3 border-white/10 hover:bg-white/6 text-white/70'
                    if (mcqSubmitted) {
                      if (oi === correctIdx) cls = 'bg-green-500/15 border-green-500/40 text-green-300'
                      else if (oi === selectedIdx && oi !== correctIdx) cls = 'bg-red-500/15 border-red-500/40 text-red-300'
                      else cls = 'bg-white/2 border-white/5 text-white/30'
                    } else if (oi === selectedIdx) {
                      cls = 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                    }
                    return (
                      <button
                        key={oi}
                        onClick={() => selectMcqAnswer(q.id, oi)}
                        disabled={mcqSubmitted}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all disabled:cursor-default ${cls}`}
                      >
                        <span className="text-white/30 mr-2 text-xs">{String.fromCharCode(65 + oi)}.</span>
                        {opt.text}
                        {mcqSubmitted && oi === correctIdx && <CheckCircle className="w-3.5 h-3.5 inline ml-2 text-green-400" />}
                        {mcqSubmitted && oi === selectedIdx && oi !== correctIdx && <XCircle className="w-3.5 h-3.5 inline ml-2 text-red-400" />}
                      </button>
                    )
                  })}
                </div>

                {/* Hint + Explanation */}
                <div className="mt-3 ml-4 flex flex-col gap-2">
                  {!mcqSubmitted && (
                    <button
                      onClick={() => toggleHint(q.id)}
                      className="flex items-center gap-1.5 text-xs text-amber-400/70 hover:text-amber-400 transition-colors w-fit"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      {hintShown ? 'Hide hint' : 'Show hint'}
                    </button>
                  )}
                  {hintShown && !mcqSubmitted && (
                    <p className="text-xs text-amber-300/70 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                      💡 {q.hint}
                    </p>
                  )}
                  {mcqSubmitted && q.explanation && (
                    <p className="text-xs text-cyan-300/70 bg-cyan-500/5 border border-cyan-500/15 rounded-lg px-3 py-2">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* MCQ Check Answers */}
        {!mcqSubmitted && allMcqAnswered && (
          <button
            onClick={() => setMcqSubmitted(true)}
            className="btn-primary mt-4 text-sm py-2.5 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" /> Check MCQ Answers
          </button>
        )}
        {!mcqSubmitted && !allMcqAnswered && (
          <p className="mt-3 text-xs text-white/30">Answer all {mcqTotal} questions to check your answers</p>
        )}
        {mcqSubmitted && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-300">
              {mcqCorrect}/{mcqTotal} correct — {Math.round((mcqCorrect / mcqTotal) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* ===== SECTION 2: Coding / SQL Exercises ===== */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 text-xs font-bold">2</span>
          </div>
          <h2 className="font-display font-semibold text-base">Hands-On Exercises</h2>
        </div>

        <div className="space-y-6">
          {content.exercises.map((ex, ei) => {
            const hintRevealedCount = shownHints[ex.id] ?? -1
            const solutionShown = shownSolutions.has(ex.id)
            const code = exerciseCodes[ex.id] || ''

            return (
              <div key={ex.id} className="glass-card border border-white/5 p-5">
                {/* Exercise header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/30 text-sm">#{ei + 1}</span>
                      {ex.type === 'sql' ? (
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ex.type === 'sql' ? 'text-emerald-400 bg-emerald-500/10' : 'text-cyan-400 bg-cyan-500/10'}`}>
                        {ex.type.toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[ex.difficulty]}`}>
                        {ex.difficulty}
                      </span>
                    </div>
                    <h3 className="font-medium text-sm text-white/90">{ex.title}</h3>
                  </div>
                </div>

                {/* Problem description */}
                <div className="text-sm text-white/60 bg-white/3 border border-white/5 rounded-lg p-3 mb-4 leading-relaxed whitespace-pre-wrap">
                  {ex.description}
                </div>

                {/* Code editor */}
                <div className="mb-4">
                  <label className="block text-xs text-white/40 mb-1.5 font-medium uppercase tracking-wider">
                    Your Solution
                  </label>
                  <textarea
                    value={code}
                    onChange={e => setExerciseCodes(prev => ({ ...prev, [ex.id]: e.target.value }))}
                    disabled={submitted}
                    spellCheck={false}
                    className="w-full min-h-[160px] bg-[#0d1117] border border-white/10 rounded-lg p-3 text-sm font-mono text-green-200 resize-y focus:outline-none focus:border-purple-500/50 disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed"
                    placeholder={ex.type === 'sql' ? 'SELECT ...' : '# Write your solution here\n'}
                  />
                </div>

                {/* Hints + Solution controls */}
                <div className="flex flex-wrap gap-2">
                  {ex.hints.length > 0 && hintRevealedCount < ex.hints.length - 1 && !submitted && (
                    <button
                      onClick={() => revealNextHint(ex.id, ex.hints.length)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/15 transition-all"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      Show Hint {hintRevealedCount + 2}/{ex.hints.length}
                    </button>
                  )}
                  <button
                    onClick={() => toggleSolution(ex.id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/8 transition-all"
                  >
                    {solutionShown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {solutionShown ? 'Hide' : 'Show'} Sample Solution
                  </button>
                </div>

                {/* Revealed hints */}
                {hintRevealedCount >= 0 && (
                  <div className="mt-3 space-y-2">
                    {ex.hints.slice(0, hintRevealedCount + 1).map((hint, hi) => (
                      <p key={hi} className="text-xs text-amber-300/70 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                        💡 Hint {hi + 1}: {hint}
                      </p>
                    ))}
                  </div>
                )}

                {/* Sample solution */}
                {solutionShown && (
                  <div className="mt-3">
                    <p className="text-xs text-white/30 mb-1.5 font-medium uppercase tracking-wider">Sample Solution</p>
                    <pre className="bg-[#0d1117] border border-green-500/15 rounded-lg p-3 text-xs font-mono text-green-300/80 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {ex.sampleSolution}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Final Submit */}
      {!submitted && (
        <div className="glass-card border border-purple-500/20 bg-purple-500/5 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-medium text-sm">Ready to save your practice session?</p>
              <p className="text-xs text-white/40 mt-0.5">
                {allMcqAnswered ? `${mcqCorrect}/${mcqTotal} MCQs correct` : `Answer all MCQs first`}
                {content.exercises.length > 0 && ` · ${exercisesAttempted}/${content.exercises.length} exercises attempted`}
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !allMcqAnswered || !mcqSubmitted}
              className="btn-primary flex items-center gap-2 text-sm py-2.5 disabled:opacity-40"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Save Practice Session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

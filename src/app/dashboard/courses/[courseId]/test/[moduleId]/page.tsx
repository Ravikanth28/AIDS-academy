'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, CheckCircle, XCircle, Loader2, Brain, ChevronRight,
  Trophy, AlertCircle, Timer, ClipboardList
} from 'lucide-react'

interface Option {
  id: string
  text: string
}

interface Question {
  id: string
  text: string
  options: Option[]
}

interface TestData {
  moduleId: string
  moduleTitle: string
  passingScore: number
  questions: Question[]
}

interface ResultDetail {
  questionId: string
  questionText: string
  selectedOptionId: string
  correctOptionId: string
  correctOptionText: string
  isCorrect: boolean
  explanation: string
}

interface TestResult {
  score: number
  correctAnswers: number
  totalQuestions: number
  passed: boolean
  passingScore: number
  results: ResultDetail[]
  certificateEarned: boolean
  nextModuleId: string | null
}

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId as string
  const moduleId = params?.moduleId as string

  const [testData, setTestData] = useState<TestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<{ [qId: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [currentQ, setCurrentQ] = useState(0)

  useEffect(() => {
    fetch(`/api/student/test/${moduleId}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) {
          toast.error(data.error || 'Cannot access test')
          router.push(`/dashboard/courses/${courseId}`)
          return
        }
        setTestData(data)
        setLoading(false)
      })
  }, [moduleId])

  function selectAnswer(questionId: string, optionId: string) {
    if (result) return
    setAnswers({ ...answers, [questionId]: optionId })
  }

  async function handleSubmit() {
    if (!testData) return
    const unanswered = testData.questions.filter((q) => !answers[q.id])
    if (unanswered.length > 0) {
      toast.error(`Answer all questions first (${unanswered.length} remaining)`)
      return
    }

    setSubmitting(true)
    try {
      const answerList = testData.questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: answers[q.id],
      }))
      const res = await fetch(`/api/student/test/${moduleId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerList, courseId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      if (data.passed) {
        toast.success(data.certificateEarned ? '🏆 Certificate earned!' : '✅ Test passed!')
      } else {
        toast.error('Test failed. Study the videos and try again.')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )
  if (!testData) return null

  const answeredCount = Object.keys(answers).length
  const totalQ = testData.questions.length

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/courses/${courseId}`} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/50" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold">
            {result ? 'Test Results' : 'Module Test'}
          </h1>
          <p className="text-white/40 text-sm">{testData.moduleTitle}</p>
        </div>
      </div>

      {/* RESULTS VIEW */}
      {result ? (
        <div>
          {/* Score card */}
          <div className={`glass-card gradient-border p-8 text-center mb-6 
            ${result.passed ? 'border-green-500/30' : 'border-red-500/30'}`}>
            {result.passed ? (
              <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            )}
            <div className={`font-display text-6xl font-bold mb-2 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
              {Math.round(result.score)}%
            </div>
            <p className={`text-xl font-semibold mb-2 ${result.passed ? 'text-green-300' : 'text-red-300'}`}>
              {result.passed ? '🎉 Passed!' : '❌ Not Passed'}
            </p>
            <p className="text-white/50 text-sm">
              {result.correctAnswers} / {result.totalQuestions} correct • Passing score: {Math.round(result.passingScore)}%
            </p>
            {result.certificateEarned && (
              <div className="mt-4 flex items-center justify-center gap-2 badge-purple mx-auto w-fit px-4 py-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 font-medium">🏆 Certificate Earned!</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <Link href={`/dashboard/courses/${courseId}`} className="btn-secondary flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Course
            </Link>
            {result.passed && result.nextModuleId && (
              <Link href={`/dashboard/courses/${courseId}`} className="btn-primary flex items-center gap-2"
                onClick={() => {
                  // Store next module id to auto-select it on the course page
                  sessionStorage.setItem('nextModuleId', result.nextModuleId!)
                }}
              >
                <ChevronRight className="w-4 h-4" /> Continue to Next Module
              </Link>
            )}
            {result.certificateEarned && (
              <Link href="/dashboard/certificates" className="btn-primary flex items-center gap-2">
                <Trophy className="w-4 h-4" /> View Certificate
              </Link>
            )}
            {!result.passed && (
              <button
                onClick={() => {
                  setResult(null)
                  setAnswers({})
                  setCurrentQ(0)
                }}
                className="btn-primary flex items-center gap-2"
              >
                <ClipboardList className="w-4 h-4" /> Try Again
              </button>
            )}
          </div>

          {/* Detailed Results */}
          <div className="space-y-4">
            <h2 className="font-display font-semibold text-lg">Answer Review</h2>
            {result.results.map((r, i) => (
              <div
                key={r.questionId}
                className={`glass-card p-5 border ${r.isCorrect ? 'border-green-500/20' : 'border-red-500/20'}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {r.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="font-medium text-sm">Q{i + 1}: {r.questionText}</p>
                </div>
                {!r.isCorrect && (
                  <div className="ml-8 space-y-1">
                    <p className="text-xs text-red-400/80">
                      Your answer: {testData.questions.find((q) => q.id === r.questionId)?.options.find((o) => o.id === r.selectedOptionId)?.text || 'Not answered'}
                    </p>
                    <p className="text-xs text-green-400/80">
                      Correct: {r.correctOptionText}
                    </p>
                  </div>
                )}
                {r.explanation && (
                  <p className="ml-8 mt-2 text-xs text-white/40 italic">{r.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* TEST VIEW */
        <div>
          {/* Progress */}
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-white/50">
                Question {currentQ + 1} of {totalQ}
              </span>
              <span className="text-purple-300 font-medium">
                {answeredCount}/{totalQ} answered
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all"
                style={{ width: `${(answeredCount / totalQ) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="glass-card gradient-border p-6 mb-4">
            <div className="flex items-start gap-3 mb-5">
              <span className="badge-purple text-xs flex-shrink-0 mt-0.5">Q{currentQ + 1}</span>
              <p className="font-medium text-base leading-relaxed">
                {testData.questions[currentQ].text}
              </p>
            </div>

            <div className="space-y-3">
              {testData.questions[currentQ].options.map((option, i) => {
                const selected = answers[testData.questions[currentQ].id] === option.id
                return (
                  <button
                    key={option.id}
                    onClick={() => selectAnswer(testData.questions[currentQ].id, option.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all border
                      ${selected
                        ? 'bg-purple-500/25 border-purple-500/50 text-white'
                        : 'bg-white/3 border-white/8 text-white/70 hover:bg-white/6 hover:border-white/15 hover:text-white'}`}
                  >
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
                      ${selected
                        ? 'border-purple-400 bg-purple-500 text-white'
                        : 'border-white/20 text-white/40'}`}>
                      {['A', 'B', 'C', 'D'][i]}
                    </div>
                    <span className="text-sm">{option.text}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="btn-secondary text-sm py-2.5 px-4 disabled:opacity-30"
            >
              ← Previous
            </button>

            {/* Question dots */}
            <div className="flex gap-1.5 flex-wrap justify-center">
              {testData.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-all
                    ${i === currentQ
                      ? 'bg-purple-500 text-white'
                      : answers[q.id]
                      ? 'bg-green-500/30 text-green-300 border border-green-500/30'
                      : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {currentQ < totalQ - 1 ? (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                className="btn-secondary text-sm py-2.5 px-4"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || answeredCount < totalQ}
                className="btn-primary flex items-center gap-2 text-sm py-2.5"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Submit</>
                )}
              </button>
            )}
          </div>

          {answeredCount < totalQ && answeredCount > 0 && (
            <div className="glass-card border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300/70 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {totalQ - answeredCount} question{totalQ - answeredCount !== 1 ? 's' : ''} unanswered
            </div>
          )}

          {answeredCount === totalQ && (
            <div className="text-center mt-4">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary text-base px-10 py-4 flex items-center gap-2 mx-auto"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <><Trophy className="w-5 h-5" /> Submit Test</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

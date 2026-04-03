'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Loader2, Code2, Database, Send, Trophy, XCircle,
  CheckCircle, RotateCcw, AlertCircle, Timer, ChevronDown, ChevronUp,
  FlaskConical, Play, ChevronRight,
} from 'lucide-react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

// ─── Language config ──────────────────────────────────────────────────────────
interface LangConfig {
  label: string
  monacoLang: string
  defaultStarter: string
}

const LANGUAGES: Record<string, LangConfig> = {
  python: {
    label: 'Python 3',
    monacoLang: 'python',
    defaultStarter: '# Write your solution here\n',
  },
  javascript: {
    label: 'JavaScript',
    monacoLang: 'javascript',
    defaultStarter: '// Write your solution here\n',
  },
  typescript: {
    label: 'TypeScript',
    monacoLang: 'typescript',
    defaultStarter: '// Write your solution here\n',
  },
  java: {
    label: 'Java',
    monacoLang: 'java',
    defaultStarter: 'public class Solution {\n  public static void main(String[] args) {\n    // Write your solution here\n  }\n}\n',
  },
  cpp: {
    label: 'C++',
    monacoLang: 'cpp',
    defaultStarter: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // Write your solution here\n  return 0;\n}\n',
  },
  sql: {
    label: 'SQL',
    monacoLang: 'sql',
    defaultStarter: '-- Write your SQL query here\nSELECT ',
  },
}

function getDefaultLang(problemType: 'coding' | 'sql'): string {
  return problemType === 'sql' ? 'sql' : 'python'
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Problem {
  id: string
  type: 'coding' | 'sql'
  difficulty: 'easy' | 'medium' | 'hard'
  title: string
  description: string
  examples: Array<{ input: string; output: string }>
  constraints: string
  starterCode: string
}

interface TestContent {
  moduleTitle: string
  problems: Problem[]
}

interface Evaluation {
  problemId: string
  score: number
  passed: boolean
  correctness: string
  efficiency: string
  feedback: string
  betterApproach: string | null
}

interface TestResult {
  evaluations: Evaluation[]
  totalScore: number
  overallFeedback: string
  passed: boolean
}

const DIFFICULTY_COLORS = {
  easy: 'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  hard: 'text-red-400 bg-red-500/10 border-red-500/20',
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'
  return <span className={`font-bold text-xl ${color}`}>{score}</span>
}

export default function CodingTestPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId as string
  const moduleId = params?.moduleId as string

  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState<TestContent | null>(null)
  const [activeProblem, setActiveProblem] = useState(0)

  // Per-problem state
  const [solutions, setSolutions] = useState<Record<string, string>>({})
  const [languages, setLanguages] = useState<Record<string, string>>({})
  const [runResults, setRunResults] = useState<Record<string, { output: string; stderr: string; exitCode: number }>>({})
  const [running, setRunning] = useState<Record<string, boolean>>({})

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set())

  // Timer
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { generateTest() }, [moduleId])

  useEffect(() => {
    if (!loading && !result) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading, result])

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  async function generateTest() {
    setLoading(true)
    setContent(null)
    setSolutions({})
    setLanguages({})
    setRunResults({})
    setRunning({})
    setResult(null)
    setActiveProblem(0)
    setElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)

    try {
      const res = await fetch(`/api/student/coding-test/${moduleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3 }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to generate test')
        router.push(`/dashboard/courses/${courseId}`)
        return
      }
      setContent(data)
      const initSolutions: Record<string, string> = {}
      const initLangs: Record<string, string> = {}
      for (const p of data.problems ?? []) {
        const lang = getDefaultLang(p.type)
        initLangs[p.id] = lang
        initSolutions[p.id] = p.starterCode || LANGUAGES[lang].defaultStarter
      }
      setSolutions(initSolutions)
      setLanguages(initLangs)
    } catch {
      toast.error('Could not load coding test')
      router.push(`/dashboard/courses/${courseId}`)
    } finally {
      setLoading(false)
    }
  }

  function handleLangChange(problemId: string, newLang: string) {
    const oldLang = languages[problemId] || 'python'
    setLanguages(prev => ({ ...prev, [problemId]: newLang }))
    setSolutions(prev => {
      const currentCode = (prev[problemId] || '').trim()
      const oldDefault = (LANGUAGES[oldLang]?.defaultStarter || '').trim()
      const problemStarter = (content?.problems.find(p => p.id === problemId)?.starterCode || '').trim()
      const isAtDefault = currentCode === '' || currentCode === oldDefault || currentCode === problemStarter
      if (isAtDefault) return { ...prev, [problemId]: LANGUAGES[newLang]?.defaultStarter || '' }
      return prev
    })
    setRunResults(prev => { const n = { ...prev }; delete n[problemId]; return n })
  }

  async function runCode(problemId: string) {
    const lang = languages[problemId] || 'python'
    const code = solutions[problemId] || ''
    if (!code.trim()) { toast.error('Write some code first'); return }
    setRunning(prev => ({ ...prev, [problemId]: true }))
    setRunResults(prev => { const n = { ...prev }; delete n[problemId]; return n })
    try {
      const res = await fetch('/api/student/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, code }),
      })
      const data = await res.json()
      setRunResults(prev => ({ ...prev, [problemId]: data }))
    } catch {
      setRunResults(prev => ({
        ...prev,
        [problemId]: { output: '', stderr: 'Could not connect to execution server.', exitCode: 1 },
      }))
    } finally {
      setRunning(prev => ({ ...prev, [problemId]: false }))
    }
  }

  async function handleSubmit() {
    if (!content) return
    const unattempted = content.problems.filter(p => {
      const code = (solutions[p.id] || '').trim()
      const starter = (LANGUAGES[languages[p.id] || 'python']?.defaultStarter || '').trim()
      return code.length < 10 || code === starter
    })
    if (unattempted.length > 0) {
      toast.error(`Please attempt all ${content.problems.length} problems before submitting`)
      return
    }
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const submissions = content.problems.map(p => ({
        problemId: p.id,
        title: p.title,
        type: p.type,
        difficulty: p.difficulty,
        description: p.description,
        solution: solutions[p.id] || '',
        language: languages[p.id] || getDefaultLang(p.type),
      }))
      const res = await fetch(`/api/student/coding-test/${moduleId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      if (data.passed) {
        toast.success('Coding test completed!')
      } else {
        toast.error(`Score: ${data.totalScore}% — Review feedback to improve`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleFeedback(id: string) {
    setExpandedFeedback(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      <p className="text-white/40 text-sm">Loading coding problems...</p>
    </div>
  )

  if (!content) return null

  const problem = content.problems[activeProblem]
  const currentLang = languages[problem?.id] || getDefaultLang(problem?.type || 'coding')
  const langCfg = LANGUAGES[currentLang]
  const allAttempted = content.problems.every(p => {
    const code = (solutions[p.id] || '').trim()
    const starter = (LANGUAGES[languages[p.id] || 'python']?.defaultStarter || '').trim()
    return code.length >= 10 && code !== starter
  })

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/8 bg-[#0a0a14] flex-shrink-0">
        <Link href={`/dashboard/courses/${courseId}`} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-4 h-4 text-white/50" />
        </Link>
        <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
          <FlaskConical className="w-3 h-3" /> Test Mode
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-sm truncate">{content.moduleTitle}</h1>
          <p className="text-white/30 text-[11px]">{content.problems.length} problems · No hints</p>
        </div>
        {!result && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-white/40 font-mono">
              <Timer className="w-3 h-3" /> {formatTime(elapsed)}
            </span>
            <button onClick={generateTest} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-white/60" title="Regenerate">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── RESULTS VIEW ── */}
      {result ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-5">
            <div className={`glass-card gradient-border p-8 text-center ${result.passed ? 'border-green-500/30' : 'border-red-500/30'}`}>
              {result.passed
                ? <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-4" />
                : <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />}
              <div className={`font-display text-6xl font-bold mb-2 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                {result.totalScore}%
              </div>
              <p className={`text-lg font-semibold mb-2 ${result.passed ? 'text-green-300' : 'text-red-300'}`}>
                {result.passed ? '✅ Passed!' : '❌ Needs Improvement'}
              </p>
              <p className="text-white/50 text-sm">{result.overallFeedback}</p>
              <p className="text-white/30 text-xs mt-2">Time: {formatTime(elapsed)}</p>
            </div>

            {content.problems.map((p) => {
              const ev = result.evaluations.find(e => e.problemId === p.id)
              if (!ev) return null
              const expanded = expandedFeedback.has(p.id)
              return (
                <div key={p.id} className="glass-card border border-white/5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {ev.passed ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-sm">{p.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[p.difficulty]}`}>{p.difficulty}</span>
                          <span className="text-xs text-white/30">{(languages[p.id] || getDefaultLang(p.type)).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ScoreBadge score={ev.score} />
                      <span className="text-white/30 text-sm">/100</span>
                      <button onClick={() => toggleFeedback(p.id)} className="text-white/30 hover:text-white/60 ml-1">
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white/3 rounded-lg p-3">
                          <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-1">Correctness</p>
                          <p className="text-white/60 text-xs">{ev.correctness}</p>
                        </div>
                        <div className="bg-white/3 rounded-lg p-3">
                          <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-1">Efficiency</p>
                          <p className="text-white/60 text-xs">{ev.efficiency}</p>
                        </div>
                      </div>
                      <div className="bg-white/3 rounded-lg p-3">
                        <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-1">Feedback</p>
                        <p className="text-white/70 text-xs">{ev.feedback}</p>
                      </div>
                      {ev.betterApproach && (
                        <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-lg p-3">
                          <p className="text-xs text-cyan-400 font-medium uppercase tracking-wider mb-1">💡 Better Approach</p>
                          <p className="text-cyan-300/70 text-xs whitespace-pre-wrap">{ev.betterApproach}</p>
                        </div>
                      )}
                      <div className="bg-[#0d1117] border border-white/5 rounded-lg p-3">
                        <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-1">Your Solution</p>
                        <pre className="text-xs font-mono text-green-200/60 overflow-x-auto whitespace-pre-wrap">{solutions[p.id]}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="flex gap-3 flex-wrap">
              <Link href={`/dashboard/courses/${courseId}`} className="btn-secondary flex items-center gap-2 text-sm">
                <ArrowLeft className="w-4 h-4" /> Back to Course
              </Link>
              <button onClick={generateTest} className="btn-primary flex items-center gap-2 text-sm">
                <RotateCcw className="w-4 h-4" /> Try New Test
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── TEST TAKING VIEW — IDE layout ── */
        <div className="flex-1 flex min-h-0">

          {/* Left sidebar: problem list */}
          <div className="w-44 flex-shrink-0 border-r border-white/8 bg-[#08080f] flex flex-col">
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Problems</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {content.problems.map((p, i) => {
                const attempted = (() => {
                  const code = (solutions[p.id] || '').trim()
                  const starter = (LANGUAGES[languages[p.id] || 'python']?.defaultStarter || '').trim()
                  return code.length >= 10 && code !== starter
                })()
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveProblem(i)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs
                      ${i === activeProblem
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5 text-white/50'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">#{i + 1}</span>
                      {attempted && <CheckCircle className="w-3 h-3 text-green-400" />}
                    </div>
                    <p className="truncate font-medium">{p.title}</p>
                    <span className={`text-[10px] font-bold mt-0.5 inline-block ${
                      p.difficulty === 'easy' ? 'text-green-400' : p.difficulty === 'medium' ? 'text-amber-400' : 'text-red-400'
                    }`}>{p.difficulty}</span>
                  </button>
                )
              })}
            </div>
            <div className="p-2.5 border-t border-white/5 space-y-1.5">
              <button
                onClick={handleSubmit}
                disabled={submitting || !allAttempted}
                className="w-full btn-primary flex items-center justify-center gap-1.5 text-xs py-2 disabled:opacity-40"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {submitting ? 'Evaluating...' : 'Submit All'}
              </button>
              {!allAttempted && (
                <p className="text-[10px] text-white/25 text-center">Attempt all problems first</p>
              )}
            </div>
          </div>

          {/* Right: problem statement + editor */}
          {problem && (
            <div className="flex-1 flex flex-col min-w-0">

              {/* Problem tabs */}
              <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/8 bg-[#0a0a14] overflow-x-auto flex-shrink-0">
                {content.problems.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProblem(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                      i === activeProblem ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-white/30">#{i + 1}</span>
                    <span className="truncate max-w-[90px]">{p.title}</span>
                    <span className={`text-[9px] font-bold px-1 rounded ${
                      p.difficulty === 'easy' ? 'text-green-400' : p.difficulty === 'medium' ? 'text-amber-400' : 'text-red-400'
                    }`}>{p.difficulty[0].toUpperCase()}</span>
                  </button>
                ))}
              </div>

              {/* Split: statement | editor */}
              <div className="flex-1 flex min-h-0">

                {/* Problem statement */}
                <div className="w-[42%] flex-shrink-0 border-r border-white/8 overflow-y-auto bg-[#09090f] p-4 space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-white/30 text-xs">#{activeProblem + 1}</span>
                      {problem.type === 'sql'
                        ? <><Database className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">SQL</span></>
                        : <><Code2 className="w-3.5 h-3.5 text-cyan-400" /><span className="text-[11px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded">CODING</span></>
                      }
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[problem.difficulty]}`}>
                        {problem.difficulty}
                      </span>
                    </div>
                    <h2 className="font-display font-bold text-base leading-snug">{problem.title}</h2>
                  </div>

                  <div className="text-sm text-white/65 leading-relaxed whitespace-pre-wrap">
                    {problem.description}
                  </div>

                  {problem.examples?.length > 0 && (
                    <div className="space-y-2">
                      {problem.examples.map((ex, i) => (
                        <div key={i} className="bg-white/[0.03] border border-white/8 rounded-lg p-3">
                          <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Example {i + 1}</p>
                          <p className="text-xs font-mono text-white/50"><span className="text-white/25">Input: </span>{ex.input}</p>
                          <p className="text-xs font-mono text-white/50 mt-0.5"><span className="text-white/25">Output: </span>{ex.output}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {problem.constraints && (
                    <div className="flex items-start gap-2 text-xs text-white/40 bg-white/[0.03] border border-white/8 rounded-lg p-3">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span><span className="text-white/30 font-medium">Constraints: </span>{problem.constraints}</span>
                    </div>
                  )}
                </div>

                {/* Editor pane */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">

                  {/* Editor toolbar */}
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/8 bg-[#161b22] flex-shrink-0">
                    <select
                      value={currentLang}
                      onChange={e => handleLangChange(problem.id, e.target.value)}
                      className="text-xs px-2 py-1.5 rounded-lg border border-white/10 bg-[#0d1117] text-white/80 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                    >
                      {problem.type === 'sql' ? (
                        <option value="sql">SQL</option>
                      ) : (
                        Object.entries(LANGUAGES)
                          .filter(([k]) => k !== 'sql')
                          .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)
                      )}
                    </select>

                    <div className="flex-1" />

                    <button
                      onClick={() => runCode(problem.id)}
                      disabled={running[problem.id]}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30 active:scale-95 transition-all text-xs font-semibold disabled:opacity-50"
                    >
                      {running[problem.id]
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Play className="w-3 h-3 fill-current" />}
                      {running[problem.id] ? 'Running...' : 'Run'}
                    </button>

                    {activeProblem < content.problems.length - 1 && (
                      <button onClick={() => setActiveProblem(activeProblem + 1)} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                        Next <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Monaco Editor */}
                  <div className="flex-1 min-h-0">
                    <MonacoEditor
                      height="100%"
                      language={langCfg.monacoLang}
                      theme="vs-dark"
                      value={solutions[problem.id] || ''}
                      onChange={val => setSolutions(prev => ({ ...prev, [problem.id]: val || '' }))}
                      options={{
                        fontSize: 13,
                        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
                        fontLigatures: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        renderLineHighlight: 'line',
                        bracketPairColorization: { enabled: true },
                        automaticLayout: true,
                        tabSize: currentLang === 'python' ? 4 : 2,
                        wordWrap: 'on',
                        padding: { top: 12, bottom: 12 },
                        suggest: { showKeywords: true },
                        smoothScrolling: true,
                      }}
                    />
                  </div>

                  {/* Output panel */}
                  {runResults[problem.id] !== undefined && (
                    <div className="flex-shrink-0 border-t border-white/8 bg-[#0a0c10] min-h-[110px] max-h-[200px] overflow-y-auto">
                      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 sticky top-0 bg-[#0a0c10]">
                        <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">Output</span>
                        {runResults[problem.id].exitCode === 0
                          ? <span className="text-[10px] text-green-400 font-medium">● Exit 0</span>
                          : <span className="text-[10px] text-red-400 font-medium">● Exit {runResults[problem.id].exitCode}</span>}
                        <button
                          onClick={() => setRunResults(prev => { const n = { ...prev }; delete n[problem.id]; return n })}
                          className="ml-auto text-white/20 hover:text-white/50 text-xs"
                        >✕</button>
                      </div>
                      <div className="p-3 font-mono text-xs leading-relaxed">
                        {runResults[problem.id].output && (
                          <pre className="text-green-300/80 whitespace-pre-wrap">{runResults[problem.id].output}</pre>
                        )}
                        {runResults[problem.id].stderr && (
                          <pre className="text-red-400/80 whitespace-pre-wrap mt-1">{runResults[problem.id].stderr}</pre>
                        )}
                        {!runResults[problem.id].output && !runResults[problem.id].stderr && (
                          <span className="text-white/25 italic">No output</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


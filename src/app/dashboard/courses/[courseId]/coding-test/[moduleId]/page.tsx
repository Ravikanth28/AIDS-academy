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
  c: {
    label: 'C',
    monacoLang: 'c',
    defaultStarter: '#include <stdio.h>\n\nint main() {\n  // Write your solution here\n  return 0;\n}\n',
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

type TermLine = { type: 'out' | 'in'; text: string }
interface TermSession {
  lines: TermLine[]
  inputs: string[]    // collected stdin values so far
  prevOut: string     // output from last run (for incremental diff)
  needsMore: boolean  // program wants more stdin
  done: boolean
  exitCode: number
  stderr: string
  mode: 'incremental' | 'batch'
  batchPrompts: string[] // for C/C++/Java: extracted printf prompts
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
  const [stdinMap, setStdinMap] = useState<Record<string, string>>({})
  const [terminalTab, setTerminalTab] = useState<Record<string, 'stdin' | 'output'>>({})
  const [terminalOpen, setTerminalOpen] = useState<Record<string, boolean>>({})
  const [termSession, setTermSession] = useState<Record<string, TermSession>>({})

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set())

  // Terminal auto-scroll refs (one per problem)
  const termRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // Debounce timer for DB autosave
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Timer
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { generateTest() }, [moduleId])

  // Autosave solutions + languages to DB (debounced 2s after last change)
  useEffect(() => {
    if (Object.keys(solutions).length === 0) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      fetch(`/api/student/coding-test/${moduleId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutions, languages }),
      }).catch(() => {})
    }, 2000)
  }, [solutions, languages])

  useEffect(() => {
    if (!loading && !result) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading, result])

  // Auto-scroll each terminal to bottom whenever its session updates
  useEffect(() => {
    for (const id of Object.keys(termSession)) {
      const el = termRefs.current[id]
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [termSession])

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
    setStdinMap({})
    setTerminalTab({})
    setTerminalOpen({})
    setTermSession({})
    setResult(null)
    setActiveProblem(0)
    setElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)

    try {
      // Load test problems and any saved draft in parallel
      const [testRes, draftRes] = await Promise.all([
        fetch(`/api/student/coding-test/${moduleId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 3 }),
        }),
        fetch(`/api/student/coding-test/${moduleId}/draft`),
      ])
      const data = await testRes.json()
      if (!testRes.ok) {
        toast.error(data.error || 'Failed to generate test')
        router.push(`/dashboard/courses/${courseId}`)
        return
      }
      const draft = draftRes.ok ? await draftRes.json() : { solutions: {}, languages: {} }
      setContent(data)
      const initSolutions: Record<string, string> = {}
      const initLangs: Record<string, string> = {}
      for (const p of data.problems ?? []) {
        const lang = getDefaultLang(p.type)
        initLangs[p.id] = lang
        initSolutions[p.id] = p.starterCode || LANGUAGES[lang].defaultStarter
        // Restore draft if present for this problem
        if (draft.solutions?.[p.id]?.trim()) initSolutions[p.id] = draft.solutions[p.id]
        if (draft.languages?.[p.id]) initLangs[p.id] = draft.languages[p.id]
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

  function usesInput(code: string, lang: string): boolean {
    if (lang === 'python') return /\binput\s*\(/.test(code)
    if (lang === 'javascript' || lang === 'typescript') return /readline|prompt\s*\(/.test(code)
    if (lang === 'java') return /Scanner|BufferedReader/.test(code)
    if (lang === 'cpp' || lang === 'c') return /cin\s*>>|getline\s*\(|scanf\s*\(/.test(code)
    return false
  }

  // Extract the prompts the program will print before each input read,
  // so we can simulate them in the terminal before asking the user to type.
  function extractInputPrompts(code: string, lang: string): string[] {
    const prompts: string[] = []
    if (lang === 'c' || lang === 'cpp') {
      // Pair each scanf/cin with the printf/cout string immediately before it
      // Split code into tokens: printf("...") and scanf(...)
      const tokens: Array<{ kind: 'print' | 'scan'; text: string }> = []
      const printRe = /printf\s*\(\s*"((?:[^"\\]|\\.)*)"/g
      const coutRe = /cout\s*<<\s*"((?:[^"\\]|\\.)*)"/g
      const scanRe = /\bscanf\s*\(|\bcin\s*>>/g
      let m: RegExpExecArray | null
      while ((m = printRe.exec(code)) !== null)
        tokens.push({ kind: 'print', text: m[1].replace(/\\n/g, '').replace(/\\t/g, '\t') })
      while ((m = coutRe.exec(code)) !== null)
        tokens.push({ kind: 'print', text: m[1].replace(/\\n/g, '').replace(/\\t/g, '\t') })
      while ((m = scanRe.exec(code)) !== null)
        tokens.push({ kind: 'scan', text: '' })
      // re-sort by index
      const allRe = /(printf\s*\(\s*"(?:[^"\\]|\\.)*"|cout\s*<<\s*"(?:[^"\\]|\\.)*"|\bscanf\s*\(|\bcin\s*>>)/g
      const sorted: Array<{ kind: 'print' | 'scan'; text: string }> = []
      while ((m = allRe.exec(code)) !== null) {
        const raw = m[1]
        if (/^printf/.test(raw) || /^cout/.test(raw)) {
          const inner = raw.match(/"((?:[^"\\]|\\.)*)"/)
          sorted.push({ kind: 'print', text: inner ? inner[1].replace(/\\n/g, '').replace(/\\t/g, '\t') : '' })
        } else {
          sorted.push({ kind: 'scan', text: '' })
        }
      }
      let pending = ''
      for (const tok of sorted) {
        if (tok.kind === 'print') { pending += tok.text }
        else { prompts.push(pending); pending = '' }
      }
    } else if (lang === 'python') {
      // input("prompt") → capture the prompt string
      const re = /\binput\s*\(\s*(?:f?["']((?:[^"'\\]|\\.)*)["'])?\s*\)/g
      let m: RegExpExecArray | null
      while ((m = re.exec(code)) !== null) prompts.push(m[1] ?? '')
    } else if (lang === 'java') {
      const printRe = /System\.out\.print(?:ln)?\s*\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g
      const scanRe = /\.nextLine\s*\(\)|\.nextInt\s*\(\)|\.next\s*\(\)|\.nextDouble\s*\(\)|\.nextLong\s*\(\)/g
      const allRe = /(System\.out\.print(?:ln)?\s*\(\s*"(?:[^"\\]|\\.)*"\s*\)|\.nextLine\s*\(\)|\.nextInt\s*\(\)|\.next\s*\(\)|\.nextDouble\s*\(\)|\.nextLong\s*\(\))/g
      let m: RegExpExecArray | null
      let pending = ''
      while ((m = allRe.exec(code)) !== null) {
        const raw = m[1]
        if (/^System\.out/.test(raw)) {
          const inner = raw.match(/"((?:[^"\\]|\\.)*)"/)
          pending += inner ? inner[1].replace(/\\n/g, '').replace(/\\t/g, '\t') : ''
        } else { prompts.push(pending); pending = '' }
      }
    }
    return prompts
  }

  // Reconstruct interactive session: interleave stdin values after known (or heuristic) prompts in stdout
  function buildReplay(stdout: string, stdin: string, knownPrompts: string[] = []): TermLine[] {
    const stdinLines = stdin.split('\n').filter(l => l !== '')
    const result: TermLine[] = []
    let rest = stdout
    let si = 0
    if (knownPrompts.length > 0) {
      for (const prompt of knownPrompts) {
        if (si >= stdinLines.length) break
        const idx = prompt ? rest.indexOf(prompt) : -1
        if (idx >= 0) {
          if (idx > 0) result.push({ type: 'out', text: rest.slice(0, idx) })
          result.push({ type: 'out', text: prompt })
          result.push({ type: 'in', text: stdinLines[si++] })
          rest = rest.slice(idx + prompt.length)
        }
      }
      if (rest) result.push({ type: 'out', text: rest })
      return result
    }
    // Fallback heuristic: detect ': ' or '? ' endings as prompt boundaries
    while (rest.length > 0) {
      if (si < stdinLines.length) {
        const m = rest.match(/^([^\n]*?[?:] )/)
        if (m) {
          result.push({ type: 'out', text: m[1] })
          result.push({ type: 'in', text: stdinLines[si++] })
          rest = rest.slice(m[1].length)
          continue
        }
      }
      const nl = rest.indexOf('\n')
      if (nl === -1) {
        result.push({ type: 'out', text: rest })
        rest = ''
      } else {
        result.push({ type: 'out', text: rest.slice(0, nl + 1) })
        rest = rest.slice(nl + 1)
      }
    }
    return result
  }

  // Always-fresh run: clears state, then starts incremental (Python) or batch (others) execution
  function handleFreshRun(problemId: string) {
    const lang = languages[problemId] || 'python'
    const code = solutions[problemId] || ''
    if (!code.trim()) { toast.error('Write some code first'); return }
    setRunResults(prev => { const n = { ...prev }; delete n[problemId]; return n })
    setTermSession(prev => { const n = { ...prev }; delete n[problemId]; return n })
    setTerminalOpen(prev => ({ ...prev, [problemId]: true }))
    setTerminalTab(prev => ({ ...prev, [problemId]: 'output' }))
    const preStdin = stdinMap[problemId]?.trim()
    if (!usesInput(code, lang) || preStdin) {
      // Run directly: no input required, or user pre-filled the STDIN tab
      const initSession: TermSession = {
        lines: [], inputs: [], prevOut: '', needsMore: false,
        done: false, exitCode: 0, stderr: '', mode: 'batch', batchPrompts: [],
      }
      setTermSession(prev => ({ ...prev, [problemId]: initSession }))
      executeRun(problemId, preStdin || '', initSession, false)
      return
    }
    // Code uses input — incremental for Python, batch-prompt for others
    const mode: 'incremental' | 'batch' = lang === 'python' ? 'incremental' : 'batch'
    const batchPrompts = mode === 'batch' ? extractInputPrompts(code, lang) : []
    const initSession: TermSession = {
      lines: [], inputs: [], prevOut: '', needsMore: true,
      done: false, exitCode: 0, stderr: '', mode, batchPrompts,
    }
    setTermSession(prev => ({ ...prev, [problemId]: initSession }))
    if (mode === 'incremental') {
      // Probe run with empty stdin — reveals initial output up to first prompt
      executeRun(problemId, '', initSession, true)
    }
    // Batch: session ready, JSX renders first batchPrompt with cursor
  }

  async function executeRun(problemId: string, stdin: string, snapshot: TermSession, incremental: boolean) {
    const lang = languages[problemId] || 'python'
    const code = solutions[problemId] || ''
    setRunning(prev => ({ ...prev, [problemId]: true }))
    try {
      const res = await fetch('/api/student/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, code, stdin }),
      })
      const data = await res.json()
      const newOut: string = data.output || ''
      const newErr: string = data.stderr || ''
      if (incremental) {
        // Show only what's new since the last run (the diff)
        const prevOut = snapshot.prevOut
        const diff = newOut.startsWith(prevOut) ? newOut.slice(prevOut.length) : newOut
        const needsMore = /EOFError/.test(newErr)
        setTermSession(prev => {
          const sess = prev[problemId] || snapshot
          const newLines: TermLine[] = [...sess.lines]
          if (diff) {
            if (needsMore) {
              // Part before last '\n' is intermediate output; after is the active prompt
              const lastNl = diff.lastIndexOf('\n')
              const outPart = lastNl >= 0 ? diff.slice(0, lastNl + 1) : ''
              const promptPart = lastNl >= 0 ? diff.slice(lastNl + 1) : diff
              if (outPart) newLines.push({ type: 'out', text: outPart })
              if (promptPart) newLines.push({ type: 'out', text: promptPart })
            } else {
              newLines.push({ type: 'out', text: diff })
            }
          }
          return {
            ...prev, [problemId]: {
              ...sess, lines: newLines, prevOut: newOut,
              needsMore, done: !needsMore,
              exitCode: needsMore ? 0 : (data.exitCode ?? 0),
              stderr: needsMore ? '' : newErr,
            },
          }
        })
        if (!needsMore) setRunResults(prev => ({ ...prev, [problemId]: data }))
      } else {
        // Batch run: build interleaved replay and store as session lines
        const replayLines = buildReplay(newOut, stdin, snapshot.batchPrompts)
        setTermSession(prev => {
          const sess = prev[problemId] || snapshot
          return {
            ...prev, [problemId]: {
              ...sess, lines: replayLines, done: true, needsMore: false,
              exitCode: data.exitCode ?? 0, stderr: newErr, prevOut: newOut,
            },
          }
        })
        setRunResults(prev => ({ ...prev, [problemId]: data }))
      }
    } catch {
      setTermSession(prev => {
        const sess = prev[problemId] || snapshot
        return {
          ...prev, [problemId]: {
            ...sess, done: true, needsMore: false,
            stderr: 'Could not connect to execution server.', exitCode: 1,
          },
        }
      })
    } finally {
      setRunning(prev => ({ ...prev, [problemId]: false }))
    }
  }

  function handleInputEnter(problemId: string, value: string) {
    const sess = termSession[problemId]
    if (!sess || sess.done) return
    const newInputs = [...sess.inputs, value]
    if (sess.mode === 'incremental') {
      // Echo value, then run next incremental step
      setTermSession(prev => {
        const s = prev[problemId]
        if (!s) return prev
        return { ...prev, [problemId]: { ...s, lines: [...s.lines, { type: 'in' as const, text: value }], inputs: newInputs, needsMore: false } }
      })
      executeRun(problemId, newInputs.join('\n'), { ...sess, inputs: newInputs }, true)
    } else {
      // Batch: collect inputs one by one, auto-run when all collected
      const totalExpected = Math.max(sess.batchPrompts.length, 1)
      const allCollected = newInputs.length >= totalExpected
      setTermSession(prev => {
        const s = prev[problemId]
        if (!s) return prev
        return { ...prev, [problemId]: { ...s, lines: [...s.lines, { type: 'in' as const, text: value }], inputs: newInputs, needsMore: !allCollected } }
      })
      if (allCollected) {
        const stdin = newInputs.join('\n')
        executeRun(problemId, stdin, { ...sess, inputs: newInputs }, false)
      }
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
        examples: p.examples ?? [],
      }))
      const res = await fetch(`/api/student/coding-test/${moduleId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Delete draft from DB on successful submission
      fetch(`/api/student/coding-test/${moduleId}/draft`, { method: 'DELETE' }).catch(() => {})
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
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0d1117]">

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
                      onClick={() => handleFreshRun(problem.id)}
                      disabled={running[problem.id]}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30 active:scale-95 transition-all text-xs font-semibold disabled:opacity-50"
                    >
                      {running[problem.id]
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Play className="w-3 h-3 fill-current" />}
                      {running[problem.id] ? 'Running...' : 'Run'}
                    </button>

                    <button
                      onClick={() => {
                        setTerminalOpen(prev => ({ ...prev, [problem.id]: !prev[problem.id] }))
                        if (!terminalOpen[problem.id]) {
                          setTerminalTab(prev => ({ ...prev, [problem.id]: prev[problem.id] ?? 'stdin' }))
                        }
                      }}
                      title="Toggle terminal / stdin"
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        terminalOpen[problem.id]
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                          : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                      }`}
                    >
                      <span className="font-mono text-[11px]">⌨</span>
                      {usesInput(solutions[problem.id] || '', currentLang) && !terminalOpen[problem.id] && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      )}
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

                  {/* Terminal panel — always visible once opened */}
                  {terminalOpen[problem.id] && (
                    <div className="flex-shrink-0 border-t border-white/8 bg-[#0a0c10]" style={{ height: 220 }}>
                      {/* Terminal tab bar */}
                      <div className="flex items-center gap-0 border-b border-white/8 bg-[#0d1117] select-none">
                        <button
                          onClick={() => setTerminalTab(prev => ({ ...prev, [problem.id]: 'stdin' }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border-r border-white/8 transition-colors ${
                            (terminalTab[problem.id] ?? 'output') === 'stdin'
                              ? 'text-amber-300 bg-amber-500/10'
                              : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                          }`}
                        >
                          <span className="font-mono text-[10px]">⌨</span> STDIN
                        </button>
                        <button
                          onClick={() => setTerminalTab(prev => ({ ...prev, [problem.id]: 'output' }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border-r border-white/8 transition-colors ${
                            (terminalTab[problem.id] ?? 'output') === 'output'
                              ? 'text-green-300 bg-green-500/10'
                              : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-[10px]">▶</span> TERMINAL
                          {runResults[problem.id] !== undefined && (
                            runResults[problem.id].exitCode === 0
                              ? <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                              : <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                          )}
                          {running[problem.id] && (
                            <Loader2 className="ml-1 w-3 h-3 animate-spin text-cyan-400" />
                          )}
                        </button>
                        <div className="flex-1" />
                        {usesInput(solutions[problem.id] || '', currentLang) && (terminalTab[problem.id] ?? 'output') === 'output' && !stdinMap[problem.id]?.trim() && termSession[problem.id] === undefined && !running[problem.id] && (
                          <span className="text-[10px] text-amber-400/70 px-3 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> needs input
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setTerminalOpen(prev => ({ ...prev, [problem.id]: false }))
                            setRunResults(prev => { const n = { ...prev }; delete n[problem.id]; return n })
                          }}
                          className="px-2 py-1.5 text-white/20 hover:text-white/50 text-xs transition-colors"
                        >✕</button>
                      </div>

                      {/* Tab content */}
                      {(terminalTab[problem.id] ?? 'output') === 'stdin' ? (
                        <div className="h-[calc(100%-30px)] flex flex-col p-2 gap-1.5">
                          <p className="text-[10px] text-amber-400/60 px-1">
                            Enter program inputs, one per line. Each line is fed to one <code className="bg-white/10 px-1 rounded">input()</code> call.
                          </p>
                          <textarea
                            className="flex-1 w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 font-mono text-xs text-amber-100/80 resize-none focus:outline-none focus:border-amber-500/40 placeholder:text-white/20 leading-relaxed"
                            placeholder={"e.g.\n5\nhello world\n42"}
                            value={stdinMap[problem.id] || ''}
                            onChange={e => setStdinMap(prev => ({ ...prev, [problem.id]: e.target.value }))}
                            spellCheck={false}
                          />
                        </div>
                      ) : (
                        <div
                          ref={el => { termRefs.current[problem.id] = el }}
                          className="h-[calc(100%-30px)] overflow-y-auto p-3 font-mono text-xs leading-relaxed"
                        >
                          {/* Terminal session — incremental (Python) or batch (C/C++/Java) */}
                          {termSession[problem.id] ? (() => {
                            const sess = termSession[problem.id]
                            // Separate the active prompt from displayable lines
                            let displayLines = sess.lines
                            let activePrompt = ''
                            if (!sess.done && sess.needsMore && !running[problem.id]) {
                              if (sess.mode === 'incremental') {
                                // In incremental mode the last 'out' line without trailing \n is the prompt
                                const last = displayLines[displayLines.length - 1]
                                if (last?.type === 'out' && !last.text.endsWith('\n')) {
                                  activePrompt = last.text
                                  displayLines = displayLines.slice(0, -1)
                                }
                              } else {
                                // Batch: prompt comes from the extracted list
                                activePrompt = sess.batchPrompts[sess.inputs.length] ?? ''
                              }
                            }
                            return (
                              <>
                                {/* Command header + exit badge */}
                                <div className="flex items-center gap-1.5 text-white/25 mb-1 pb-1.5 border-b border-white/5">
                                  <span className="text-green-400/50">$</span>
                                  <span>
                                    {currentLang === 'python' ? 'python solution.py'
                                      : currentLang === 'javascript' ? 'node solution.js'
                                      : currentLang === 'typescript' ? 'ts-node solution.ts'
                                      : currentLang === 'java' ? 'java Solution'
                                      : (currentLang === 'cpp' || currentLang === 'c') ? './solution'
                                      : 'run'}
                                  </span>
                                  {sess.done && (
                                    <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                      sess.exitCode === 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                                    }`}>exit {sess.exitCode}</span>
                                  )}
                                </div>
                                {/* Accumulated terminal lines */}
                                <div className="whitespace-pre-wrap">
                                  {displayLines.map((ln, i) =>
                                    ln.type === 'in'
                                      ? <span key={i} className="text-amber-300">{ln.text + '\n'}</span>
                                      : <span key={i} className="text-[#d4d4d4]">{ln.text}</span>
                                  )}
                                </div>
                                {/* Stderr */}
                                {sess.done && sess.stderr ? (
                                  <pre className="text-red-400 whitespace-pre-wrap mt-1">{sess.stderr}</pre>
                                ) : null}
                                {sess.done && !sess.lines.some(l => l.text.trim()) && !sess.stderr ? (
                                  <span className="text-white/25 italic">Program exited with no output</span>
                                ) : null}
                                {/* Spinner while running between incremental steps */}
                                {running[problem.id] && (
                                  <div className="flex items-center gap-2 text-cyan-400/60 mt-1">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Running...</span>
                                  </div>
                                )}
                                {/* Active input line: prompt text + cursor */}
                                {!running[problem.id] && !sess.done && sess.needsMore && (
                                  <div className="flex items-center font-mono text-xs mt-0.5">
                                    {activePrompt && <span className="text-[#d4d4d4] whitespace-pre">{activePrompt}</span>}
                                    <input
                                      autoFocus
                                      type="text"
                                      className="flex-1 min-w-[60px] bg-transparent border-none outline-none font-mono text-xs text-amber-300 caret-amber-400 placeholder:text-white/15"
                                      placeholder={activePrompt ? '' : 'type value ↵'}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          handleInputEnter(problem.id, e.currentTarget.value)
                                          e.currentTarget.value = ''
                                        }
                                      }}
                                      spellCheck={false}
                                    />
                                  </div>
                                )}
                                {/* Manual run button for batch mode */}
                                {!running[problem.id] && !sess.done && sess.mode === 'batch' && sess.inputs.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                    <button
                                      onClick={() => {
                                        const stdin = sess.inputs.join('\n')
                                        setStdinMap(prev => ({ ...prev, [problem.id]: stdin }))
                                        executeRun(problem.id, stdin, sess, false)
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30 text-xs font-semibold transition-all"
                                    >
                                      <Play className="w-3 h-3 fill-current" /> Run
                                    </button>
                                    <span className="text-white/20 text-[10px]">or press Enter after last value</span>
                                  </div>
                                )}
                              </>
                            )
                          })() : running[problem.id] ? (
                            <div className="flex items-center gap-2 text-cyan-400/60">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Running...</span>
                            </div>
                          ) : (
                            <span className="text-white/20 italic">Press Run to execute your code</span>
                          )}
                        </div>
                      )}
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


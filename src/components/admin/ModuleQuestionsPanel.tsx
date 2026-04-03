'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Save, Loader2, Upload, CheckCircle, X, ChevronDown, ChevronUp, Settings, Clock, PlayCircle,
  Code2, Database, FlaskConical, BookOpen
} from 'lucide-react'

interface Option {
  text: string
  isCorrect: boolean
}

interface QuestionForm {
  text: string
  explanation: string
  options: Option[]
}

interface CheckpointForm {
  text: string
  explanation: string
  options: Option[]
  videoId: string
  timestamp: string // MM:SS format for input
}

interface Question {
  id: string
  text: string
  explanation: string
  videoId: string | null
  timestamp: number | null
  video?: { id: string; title: string } | null
  options: { id: string; text: string; isCorrect: boolean; order: number }[]
}

interface VideoItem {
  id: string
  title: string
  youtubeUrl: string
  order: number
}

interface CodingQuestionForm {
  type: 'coding' | 'sql'
  difficulty: 'easy' | 'medium' | 'hard'
  mode: 'practice' | 'test' | 'both'
  title: string
  description: string
  examples: Array<{ input: string; output: string }>
  constraints: string
  starterCode: string
  hints: string[]
  sampleSolution: string
}

interface SavedCodingQuestion {
  id: string
  type: string
  difficulty: string
  mode: string
  title: string
  description: string
  examples: string
  constraints: string | null
  starterCode: string
  hints: string
  sampleSolution: string
  order: number
}

interface Props {
  moduleId: string
  passingScore: number
  questionCount: number
  videos?: VideoItem[]
  onSave: () => void
}

const emptyQuestion = (): QuestionForm => ({
  text: '',
  explanation: '',
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
})

const emptyCodingQ = (): CodingQuestionForm => ({
  type: 'coding',
  difficulty: 'medium',
  mode: 'both',
  title: '',
  description: '',
  examples: [{ input: '', output: '' }],
  constraints: '',
  starterCode: '',
  hints: [''],
  sampleSolution: '',
})

const emptyCheckpoint = (): CheckpointForm => ({
  text: '',
  explanation: '',
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
  videoId: '',
  timestamp: '',
})

function parseTimestamp(ts: string): number | null {
  const match = ts.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ModuleQuestionsPanel({ moduleId, passingScore, questionCount, videos = [], onSave }: Props) {
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()])
  const [existingQs, setExistingQs] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [tab, setTab] = useState<'manual' | 'bulk' | 'checkpoint' | 'coding' | 'settings'>('manual')

  // Coding questions state
  const [codingQs, setCodingQs] = useState<CodingQuestionForm[]>([emptyCodingQ()])
  const [existingCodingQs, setExistingCodingQs] = useState<SavedCodingQuestion[]>([])
  const [expandedCq, setExpandedCq] = useState<number>(0)
  const [loadingCoding, setLoadingCoding] = useState(false)
  const [bulkCsv, setBulkCsv] = useState('')
  const [settings, setSettings] = useState({ passingScore, questionCount })
  const [savingSettings, setSavingSettings] = useState(false)
  const [expandedQ, setExpandedQ] = useState<number>(0)
  const [checkpoints, setCheckpoints] = useState<CheckpointForm[]>([emptyCheckpoint()])
  const [expandedCp, setExpandedCp] = useState<number>(0)

  useEffect(() => {
    fetchExisting()
    fetchCodingQuestions()
  }, [moduleId])

  async function fetchCodingQuestions() {
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/coding-questions`)
      const data = await res.json()
      if (res.ok) setExistingCodingQs(Array.isArray(data) ? data : [])
    } catch { /* silent */ }
  }

  function updateCodingQ(idx: number, field: keyof CodingQuestionForm, value: unknown) {
    const updated = [...codingQs]
    updated[idx] = { ...updated[idx], [field]: value }
    setCodingQs(updated)
  }

  function addCodingExample(idx: number) {
    const updated = [...codingQs]
    updated[idx].examples = [...updated[idx].examples, { input: '', output: '' }]
    setCodingQs(updated)
  }

  function updateCodingExample(qIdx: number, eIdx: number, field: 'input' | 'output', value: string) {
    const updated = [...codingQs]
    updated[qIdx].examples[eIdx] = { ...updated[qIdx].examples[eIdx], [field]: value }
    setCodingQs(updated)
  }

  function removeCodingExample(qIdx: number, eIdx: number) {
    const updated = [...codingQs]
    updated[qIdx].examples = updated[qIdx].examples.filter((_, i) => i !== eIdx)
    setCodingQs(updated)
  }

  function addHint(qIdx: number) {
    const updated = [...codingQs]
    updated[qIdx].hints = [...updated[qIdx].hints, '']
    setCodingQs(updated)
  }

  function updateHint(qIdx: number, hIdx: number, value: string) {
    const updated = [...codingQs]
    updated[qIdx].hints[hIdx] = value
    setCodingQs(updated)
  }

  function removeHint(qIdx: number, hIdx: number) {
    const updated = [...codingQs]
    updated[qIdx].hints = updated[qIdx].hints.filter((_, i) => i !== hIdx)
    setCodingQs(updated)
  }

  async function handleSaveCodingQ() {
    const valid = codingQs.filter(q => q.title.trim() && q.description.trim())
    if (valid.length === 0) {
      return toast.error('Each coding question needs a title and description')
    }
    setLoadingCoding(true)
    try {
      for (const q of valid) {
        const res = await fetch(`/api/admin/modules/${moduleId}/coding-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(q),
        })
        if (!res.ok) throw new Error()
      }
      toast.success(`${valid.length} coding question(s) saved!`)
      setCodingQs([emptyCodingQ()])
      setExpandedCq(0)
      fetchCodingQuestions()
    } catch {
      toast.error('Failed to save coding questions')
    } finally {
      setLoadingCoding(false)
    }
  }

  async function handleDeleteCodingQ(questionId: string) {
    try {
      await fetch(`/api/admin/modules/${moduleId}/coding-questions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      })
      toast.success('Deleted')
      fetchCodingQuestions()
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function fetchExisting() {
    setLoadingExisting(true)
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/questions`)
      const data = await res.json()
      setExistingQs(data)
    } finally {
      setLoadingExisting(false)
    }
  }

  function updateQuestion(index: number, field: keyof QuestionForm, value: string) {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  function updateOption(qIndex: number, oIndex: number, field: keyof Option, value: string | boolean) {
    const updated = [...questions]
    updated[qIndex].options[oIndex] = { ...updated[qIndex].options[oIndex], [field]: value }
    setQuestions(updated)
  }

  function setCorrect(qIndex: number, oIndex: number) {
    const updated = [...questions]
    updated[qIndex].options = updated[qIndex].options.map((o, i) => ({ ...o, isCorrect: i === oIndex }))
    setQuestions(updated)
  }

  async function handleSaveManual() {
    const valid = questions.filter(
      (q) => q.text && q.options.some((o) => o.isCorrect) && q.options.every((o) => o.text)
    )
    if (valid.length === 0) {
      return toast.error('Each question needs text, all options filled, and one correct answer')
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: valid }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${valid.length} question(s) saved!`)
      setQuestions([emptyQuestion()])
      fetchExisting()
      onSave()
    } catch {
      toast.error('Failed to save questions')
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkSave() {
    // Parse CSV format: question_text,option1,option2,option3,option4,correct_index(1-4),explanation
    const lines = bulkCsv.trim().split('\n').filter((l) => l.trim())
    const parsed: QuestionForm[] = []
    const errors: string[] = []

    lines.forEach((line, i) => {
      // Skip header row if it contains text like "question"
      if (i === 0 && line.toLowerCase().includes('question')) return
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      if (cols.length < 6) {
        errors.push(`Row ${i + 1}: needs at least 6 columns`)
        return
      }
      const [text, opt1, opt2, opt3, opt4, correctIdx, explanation] = cols
      const cIdx = parseInt(correctIdx) - 1
      if (isNaN(cIdx) || cIdx < 0 || cIdx > 3) {
        errors.push(`Row ${i + 1}: correct_index must be 1-4`)
        return
      }
      parsed.push({
        text,
        explanation: explanation || '',
        options: [opt1, opt2, opt3, opt4].map((t, idx) => ({ text: t, isCorrect: idx === cIdx })),
      })
    })

    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }
    if (parsed.length === 0) {
      return toast.error('No valid questions found in CSV')
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsed }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${parsed.length} questions imported!`)
      setBulkCsv('')
      fetchExisting()
      onSave()
    } catch {
      toast.error('Failed to import questions')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteQuestion(qId: string) {
    try {
      await fetch(`/api/admin/modules/${moduleId}/questions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: qId }),
      })
      toast.success('Question deleted')
      fetchExisting()
      onSave()
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error()
      toast.success('Module settings saved!')
      onSave()
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  function updateCheckpoint(index: number, field: keyof CheckpointForm, value: string) {
    const updated = [...checkpoints]
    updated[index] = { ...updated[index], [field]: value }
    setCheckpoints(updated)
  }

  function updateCheckpointOption(cpIdx: number, oIdx: number, field: keyof Option, value: string | boolean) {
    const updated = [...checkpoints]
    updated[cpIdx].options[oIdx] = { ...updated[cpIdx].options[oIdx], [field]: value }
    setCheckpoints(updated)
  }

  function setCheckpointCorrect(cpIdx: number, oIdx: number) {
    const updated = [...checkpoints]
    updated[cpIdx].options = updated[cpIdx].options.map((o, i) => ({ ...o, isCorrect: i === oIdx }))
    setCheckpoints(updated)
  }

  async function handleSaveCheckpoints() {
    const valid = checkpoints.filter(
      (cp) => cp.text && cp.videoId && cp.timestamp && cp.options.some((o) => o.isCorrect) && cp.options.every((o) => o.text)
    )
    if (valid.length === 0) {
      return toast.error('Each checkpoint needs: question text, video, timestamp (MM:SS), all options filled, one correct')
    }

    // Validate timestamps
    for (const cp of valid) {
      if (parseTimestamp(cp.timestamp) === null) {
        return toast.error(`Invalid timestamp "${cp.timestamp}". Use MM:SS format (e.g., 08:20)`)
      }
    }

    setLoading(true)
    try {
      const payload = valid.map((cp) => ({
        text: cp.text,
        explanation: cp.explanation,
        videoId: cp.videoId,
        timestamp: parseTimestamp(cp.timestamp),
        options: cp.options,
      }))

      const res = await fetch(`/api/admin/modules/${moduleId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: payload }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${valid.length} checkpoint question(s) saved!`)
      setCheckpoints([emptyCheckpoint()])
      fetchExisting()
      onSave()
    } catch {
      toast.error('Failed to save checkpoint questions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'manual', label: 'Add Manually', icon: Plus },
          { key: 'bulk', label: 'Bulk CSV/Excel', icon: Upload },
          { key: 'checkpoint', label: 'Checkpoint Qs', icon: Clock },
          { key: 'coding', label: 'Coding Questions', icon: Code2 },
          { key: 'settings', label: 'Test Settings', icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${tab === key
                ? key === 'coding'
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                  : 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300'
                : 'bg-white/5 text-white/50 hover:text-white'}`}
          >
            <Icon className="w-4 h-4" /> {label}
            {key === 'coding' && existingCodingQs.length > 0 && (
              <span className="ml-1 text-xs bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded-full">
                {existingCodingQs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Manual Add */}
      {tab === 'manual' && (
        <div>
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="glass-card border border-white/8 rounded-xl mb-3 overflow-hidden">
              <button
                onClick={() => setExpandedQ(expandedQ === qIdx ? -1 : qIdx)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3"
              >
                <span className="badge-cyan text-xs flex-shrink-0">Q{qIdx + 1}</span>
                <span className="text-sm flex-1 truncate text-white/70">
                  {q.text || 'Empty question...'}
                </span>
                {q.options.some((o) => o.isCorrect) && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                {expandedQ === qIdx ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>

              {expandedQ === qIdx && (
                <div className="border-t border-white/5 p-4 space-y-3">
                  <textarea
                    className="input-field resize-none text-sm"
                    placeholder="Question text"
                    value={q.text}
                    rows={2}
                    onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCorrect(qIdx, oIdx)}
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all
                            ${opt.isCorrect
                              ? 'border-green-400 bg-green-400'
                              : 'border-white/20 hover:border-white/40'}`}
                        >
                          {opt.isCorrect && <CheckCircle className="w-full h-full text-white fill-current" />}
                        </button>
                        <input
                          className="input-field text-sm py-2 flex-1"
                          placeholder={`Option ${oIdx + 1}`}
                          value={opt.text}
                          onChange={(e) => updateOption(qIdx, oIdx, 'text', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <input
                    className="input-field text-sm"
                    placeholder="Explanation (optional)"
                    value={q.explanation}
                    onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                  />
                  {questions.length > 1 && (
                    <button
                      onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))}
                      className="text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove question
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <button
              onClick={() => { setQuestions([...questions, emptyQuestion()]); setExpandedQ(questions.length) }}
              className="btn-secondary flex items-center gap-2 text-sm py-2.5"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
            <button onClick={handleSaveManual} disabled={loading} className="btn-primary flex items-center gap-2 text-sm py-2.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save {questions.length} Question{questions.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Bulk CSV */}
      {tab === 'bulk' && (
        <div>
          <div className="glass-card border border-cyan-500/20 p-4 mb-4 text-xs text-white/50">
            <p className="text-cyan-300 font-medium mb-2">CSV Format (one question per row):</p>
            <code className="block font-mono text-xs leading-relaxed">
              question_text,option1,option2,option3,option4,correct_index,explanation
              <br />
              &quot;What is Python?&quot;,&quot;A snake&quot;,&quot;A language&quot;,&quot;A tool&quot;,&quot;A game&quot;,2,&quot;Python is a programming language&quot;
            </code>
            <p className="mt-2 text-white/30">correct_index = 1-4 (which option is correct)</p>
          </div>
          <textarea
            className="input-field resize-none text-sm font-mono h-48 mb-4"
            placeholder="Paste CSV content here..."
            value={bulkCsv}
            onChange={(e) => setBulkCsv(e.target.value)}
          />
          <button onClick={handleBulkSave} disabled={loading || !bulkCsv.trim()} className="btn-primary flex items-center gap-2 text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import Questions
          </button>
        </div>
      )}

      {/* Checkpoint Questions */}
      {tab === 'checkpoint' && (
        <div>
          {videos.length === 0 ? (
            <div className="glass-card border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <PlayCircle className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
              <p className="text-sm text-amber-300/70">Add videos to this module first before creating checkpoint questions.</p>
            </div>
          ) : (
            <>
              <div className="glass-card border border-purple-500/20 p-4 mb-4 text-xs text-white/50">
                <p className="text-purple-300 font-medium mb-1">Checkpoint Questions</p>
                <p>Attach quiz questions to specific timestamps in videos. Students will see these while watching — the video pauses and they must answer correctly to continue.</p>
              </div>

              {checkpoints.map((cp, cpIdx) => (
                <div key={cpIdx} className="glass-card border border-white/8 rounded-xl mb-3 overflow-hidden">
                  <button
                    onClick={() => setExpandedCp(expandedCp === cpIdx ? -1 : cpIdx)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3"
                  >
                    <span className="badge-purple text-xs flex-shrink-0">
                      <Clock className="w-3 h-3 inline mr-1" />CP{cpIdx + 1}
                    </span>
                    <span className="text-sm flex-1 truncate text-white/70">
                      {cp.text || 'New checkpoint question...'}
                    </span>
                    {cp.timestamp && <span className="text-xs text-purple-300 font-mono">{cp.timestamp}</span>}
                    {expandedCp === cpIdx ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </button>

                  {expandedCp === cpIdx && (
                    <div className="border-t border-white/5 p-4 space-y-3">
                      {/* Video & Timestamp selectors */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-white/50 mb-1 block">Video</label>
                          <select
                            className="input-field text-sm"
                            value={cp.videoId}
                            onChange={(e) => updateCheckpoint(cpIdx, 'videoId', e.target.value)}
                          >
                            <option value="">Select video...</option>
                            {videos.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.order + 1}. {v.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-white/50 mb-1 block">Timestamp (MM:SS)</label>
                          <input
                            className="input-field text-sm font-mono"
                            placeholder="08:20"
                            value={cp.timestamp}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9:]/g, '')
                              updateCheckpoint(cpIdx, 'timestamp', val)
                            }}
                          />
                        </div>
                      </div>
                      <textarea
                        className="input-field resize-none text-sm"
                        placeholder="Checkpoint question text (e.g., 'What method was just discussed for handling missing data?')"
                        value={cp.text}
                        rows={2}
                        onChange={(e) => updateCheckpoint(cpIdx, 'text', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {cp.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCheckpointCorrect(cpIdx, oIdx)}
                              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all
                                ${opt.isCorrect
                                  ? 'border-green-400 bg-green-400'
                                  : 'border-white/20 hover:border-white/40'}`}
                            >
                              {opt.isCorrect && <CheckCircle className="w-full h-full text-white fill-current" />}
                            </button>
                            <input
                              className="input-field text-sm py-2 flex-1"
                              placeholder={`Option ${oIdx + 1}`}
                              value={opt.text}
                              onChange={(e) => updateCheckpointOption(cpIdx, oIdx, 'text', e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                      <input
                        className="input-field text-sm"
                        placeholder="Explanation (optional)"
                        value={cp.explanation}
                        onChange={(e) => updateCheckpoint(cpIdx, 'explanation', e.target.value)}
                      />
                      {checkpoints.length > 1 && (
                        <button
                          onClick={() => setCheckpoints(checkpoints.filter((_, i) => i !== cpIdx))}
                          className="text-xs text-zinc-400/70 hover:text-zinc-300 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove checkpoint
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-3">
                <button
                  onClick={() => { setCheckpoints([...checkpoints, emptyCheckpoint()]); setExpandedCp(checkpoints.length) }}
                  className="btn-secondary flex items-center gap-2 text-sm py-2.5"
                >
                  <Plus className="w-4 h-4" /> Add Checkpoint
                </button>
                <button onClick={handleSaveCheckpoints} disabled={loading} className="btn-primary flex items-center gap-2 text-sm py-2.5">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Checkpoints
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== CODING QUESTIONS TAB ===== */}
      {tab === 'coding' && (
        <div>
          <div className="glass-card border border-purple-500/20 bg-purple-500/5 p-4 mb-5 text-xs text-white/50">
            <p className="text-purple-300 font-medium mb-1 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" /> Coding &amp; SQL Questions
            </p>
            <p>Add hands-on coding or SQL problems for <strong className="text-purple-300">Practice Mode</strong> and <strong className="text-cyan-300">Test Mode</strong>. Choose the mode to control where each problem appears. If no questions are added here, both modes will generate problems with AI from the video transcripts.</p>
          </div>

          {/* Form to add questions */}
          {codingQs.map((q, qi) => (
            <div key={qi} className="glass-card border border-white/8 rounded-xl mb-4 overflow-hidden">
              <button
                onClick={() => setExpandedCq(expandedCq === qi ? -1 : qi)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-300">
                  {qi + 1}
                </span>
                <span className="text-sm flex-1 truncate text-white/70">
                  {q.title || 'New coding problem...'}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex-shrink-0
                  ${q.type === 'sql' ? 'text-emerald-400 bg-emerald-500/10' : 'text-cyan-400 bg-cyan-500/10'}`}>
                  {q.type.toUpperCase()}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0
                  ${q.difficulty === 'easy' ? 'text-green-400 border-green-500/30' : q.difficulty === 'medium' ? 'text-amber-400 border-amber-500/30' : 'text-red-400 border-red-500/30'}`}>
                  {q.difficulty}
                </span>
                {expandedCq === qi ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>

              {expandedCq === qi && (
                <div className="border-t border-white/5 p-4 space-y-4">
                  {/* Row 1: type / difficulty / mode */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Type</label>
                      <select
                        className="input-field text-sm py-2"
                        value={q.type}
                        onChange={e => updateCodingQ(qi, 'type', e.target.value as 'coding' | 'sql')}
                      >
                        <option value="coding">Coding (Python/JS)</option>
                        <option value="sql">SQL</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Difficulty</label>
                      <select
                        className="input-field text-sm py-2"
                        value={q.difficulty}
                        onChange={e => updateCodingQ(qi, 'difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Mode</label>
                      <select
                        className="input-field text-sm py-2"
                        value={q.mode}
                        onChange={e => updateCodingQ(qi, 'mode', e.target.value as 'practice' | 'test' | 'both')}
                      >
                        <option value="both">Practice &amp; Test</option>
                        <option value="practice">Practice Only</option>
                        <option value="test">Test Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Problem Title *</label>
                    <input
                      className="input-field text-sm"
                      placeholder="e.g., Reverse a Linked List"
                      value={q.title}
                      onChange={e => updateCodingQ(qi, 'title', e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Problem Description *</label>
                    <textarea
                      className="input-field resize-none text-sm font-mono text-sm"
                      placeholder="Full problem statement. Include requirements, expected input/output format..."
                      value={q.description}
                      rows={4}
                      onChange={e => updateCodingQ(qi, 'description', e.target.value)}
                    />
                  </div>

                  {/* Examples */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-white/40">Examples</label>
                      <button onClick={() => addCodingExample(qi)} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add Example
                      </button>
                    </div>
                    <div className="space-y-2">
                      {q.examples.map((ex, ei) => (
                        <div key={ei} className="grid grid-cols-2 gap-2 items-start">
                          <input
                            className="input-field text-xs font-mono py-2"
                            placeholder="Input: e.g., nums=[1,2,3]"
                            value={ex.input}
                            onChange={e => updateCodingExample(qi, ei, 'input', e.target.value)}
                          />
                          <div className="flex items-center gap-1">
                            <input
                              className="input-field text-xs font-mono py-2 flex-1"
                              placeholder="Output: e.g., [3,2,1]"
                              value={ex.output}
                              onChange={e => updateCodingExample(qi, ei, 'output', e.target.value)}
                            />
                            {q.examples.length > 1 && (
                              <button onClick={() => removeCodingExample(qi, ei)} className="text-red-400/50 hover:text-red-400 p-1">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Constraints */}
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Constraints (optional)</label>
                    <input
                      className="input-field text-sm"
                      placeholder="e.g., O(n) time complexity, 1 ≤ n ≤ 10^4"
                      value={q.constraints}
                      onChange={e => updateCodingQ(qi, 'constraints', e.target.value)}
                    />
                  </div>

                  {/* Starter Code */}
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Starter Code / Template</label>
                    <textarea
                      className="input-field resize-none text-sm font-mono bg-[#0d1117]"
                      placeholder={q.type === 'sql' ? 'SELECT ...\nFROM ...' : 'def solution(nums):\n    # your code here\n    pass'}
                      value={q.starterCode}
                      rows={4}
                      spellCheck={false}
                      onChange={e => updateCodingQ(qi, 'starterCode', e.target.value)}
                    />
                  </div>

                  {/* Hints (Practice only) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-white/40">Hints <span className="text-white/20">(shown in Practice Mode only)</span></label>
                      <button onClick={() => addHint(qi)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add Hint
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {q.hints.map((hint, hi) => (
                        <div key={hi} className="flex items-center gap-2">
                          <span className="text-xs text-white/20 w-5 flex-shrink-0">#{hi + 1}</span>
                          <input
                            className="input-field text-sm flex-1 py-2"
                            placeholder={`Hint ${hi + 1}`}
                            value={hint}
                            onChange={e => updateHint(qi, hi, e.target.value)}
                          />
                          {q.hints.length > 1 && (
                            <button onClick={() => removeHint(qi, hi)} className="text-red-400/50 hover:text-red-400 p-1">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sample Solution */}
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Sample Solution <span className="text-white/20">(shown in Practice Mode)</span></label>
                    <textarea
                      className="input-field resize-none text-sm font-mono bg-[#0d1117] text-green-300/80"
                      placeholder="Complete working solution with comments..."
                      value={q.sampleSolution}
                      rows={5}
                      spellCheck={false}
                      onChange={e => updateCodingQ(qi, 'sampleSolution', e.target.value)}
                    />
                  </div>

                  {codingQs.length > 1 && (
                    <button
                      onClick={() => setCodingQs(codingQs.filter((_, i) => i !== qi))}
                      className="text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove this problem
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <button
              onClick={() => { setCodingQs([...codingQs, emptyCodingQ()]); setExpandedCq(codingQs.length) }}
              className="btn-secondary flex items-center gap-2 text-sm py-2.5"
            >
              <Plus className="w-4 h-4" /> Add Problem
            </button>
            <button
              onClick={handleSaveCodingQ}
              disabled={loadingCoding}
              className="btn-primary flex items-center gap-2 text-sm py-2.5"
            >
              {loadingCoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save {codingQs.length} Problem{codingQs.length > 1 ? 's' : ''}
            </button>
          </div>

          {/* Saved coding questions */}
          {existingCodingQs.length > 0 && (
            <div className="mt-6 border-t border-white/5 pt-5">
              <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">
                Saved Coding Problems ({existingCodingQs.length})
              </p>
              <div className="space-y-2">
                {existingCodingQs.map((q) => {
                  let hints: string[] = []
                  try { hints = JSON.parse(q.hints) } catch { hints = [] }
                  return (
                    <div key={q.id} className="flex items-start gap-3 p-3 glass-card rounded-xl">
                      <div className="flex-shrink-0 mt-0.5">
                        {q.type === 'sql'
                          ? <Database className="w-4 h-4 text-emerald-400" />
                          : <Code2 className="w-4 h-4 text-cyan-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium truncate">{q.title}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0
                            ${q.difficulty === 'easy' ? 'text-green-400 border-green-500/30 bg-green-500/10' : q.difficulty === 'medium' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
                            {q.difficulty}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-white/30">
                          <span className={q.mode === 'practice' ? 'text-purple-400' : q.mode === 'test' ? 'text-cyan-400' : 'text-white/40'}>
                            {q.mode === 'both' ? '🔁 Practice & Test' : q.mode === 'practice' ? '📚 Practice Only' : '🧪 Test Only'}
                          </span>
                          {hints.filter(Boolean).length > 0 && (
                            <span>{hints.filter(Boolean).length} hint{hints.filter(Boolean).length > 1 ? 's' : ''}</span>
                          )}
                          {q.sampleSolution && <span className="text-green-400/60">has solution</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCodingQ(q.id)}
                        className="p-1.5 rounded-lg hover:bg-zinc-500/20 text-white/30 hover:text-zinc-300 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      {tab === 'settings' && (
        <div className="space-y-5 max-w-sm">
          <div>
            <label className="text-sm text-white/60 mb-2 block">Passing Score (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              className="input-field"
              value={settings.passingScore}
              onChange={(e) => setSettings({ ...settings, passingScore: Number(e.target.value) })}
            />
            <p className="text-xs text-white/30 mt-1">Students need this % score to pass</p>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-2 block">Questions per Test</label>
            <input
              type="number"
              min="1"
              max="50"
              className="input-field"
              value={settings.questionCount}
              onChange={(e) => setSettings({ ...settings, questionCount: Number(e.target.value) })}
            />
            <p className="text-xs text-white/30 mt-1">
              How many questions to show per attempt (out of {existingQs.length} total)
            </p>
          </div>
          <button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary flex items-center gap-2 text-sm">
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      )}

      {/* Existing Questions */}
      {existingQs.length > 0 && (
        <div className="mt-6 border-t border-white/5 pt-5">
          <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">
            Saved Questions ({existingQs.length})
          </p>
          <div className="space-y-2">
            {existingQs.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3 p-3 glass-card rounded-xl">
                <span className={`text-xs flex-shrink-0 mt-0.5 ${q.timestamp != null ? 'badge-purple' : 'badge-purple'}`}>
                  {q.timestamp != null ? (
                    <><Clock className="w-3 h-3 inline mr-1" />{formatTimestamp(q.timestamp)}</>
                  ) : (
                    <>Q{i + 1}</>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">{q.text}</p>
                  {q.video && (
                    <p className="text-xs text-purple-300/60 mt-0.5 flex items-center gap-1">
                      <PlayCircle className="w-3 h-3" /> {q.video.title}
                    </p>
                  )}
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {q.options.map((o) => (
                      <span
                        key={o.id}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          o.isCorrect
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : 'bg-white/5 text-white/40'
                        }`}
                      >
                        {o.isCorrect ? '✓ ' : ''}{o.text}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="p-1.5 rounded-lg hover:bg-zinc-500/20 text-white/30 hover:text-zinc-300 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

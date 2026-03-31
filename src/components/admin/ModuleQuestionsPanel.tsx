'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Save, Loader2, Upload, CheckCircle, X, ChevronDown, ChevronUp, Settings
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

interface Question {
  id: string
  text: string
  explanation: string
  options: { id: string; text: string; isCorrect: boolean; order: number }[]
}

interface Props {
  moduleId: string
  passingScore: number
  questionCount: number
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

export default function ModuleQuestionsPanel({ moduleId, passingScore, questionCount, onSave }: Props) {
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()])
  const [existingQs, setExistingQs] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [tab, setTab] = useState<'manual' | 'bulk' | 'settings'>('manual')
  const [bulkCsv, setBulkCsv] = useState('')
  const [settings, setSettings] = useState({ passingScore, questionCount })
  const [savingSettings, setSavingSettings] = useState(false)
  const [expandedQ, setExpandedQ] = useState<number>(0)

  useEffect(() => {
    fetchExisting()
  }, [moduleId])

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

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'manual', label: 'Add Manually', icon: Plus },
          { key: 'bulk', label: 'Bulk CSV/Excel', icon: Upload },
          { key: 'settings', label: 'Test Settings', icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${tab === key
                ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300'
                : 'bg-white/5 text-white/50 hover:text-white'}`}
          >
            <Icon className="w-4 h-4" /> {label}
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
                <span className="badge-purple text-xs flex-shrink-0 mt-0.5">Q{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">{q.text}</p>
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
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
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

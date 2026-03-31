'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Brain, BookOpen, ArrowLeft, Plus, Minus, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewCoursePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'AI & Data Science',
    thumbnail: '',
    moduleCount: 3,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.description) return toast.error('Title and description required')
    if (form.moduleCount < 1 || form.moduleCount > 20) return toast.error('Module count must be 1-20')

    setLoading(true)
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create course')
      toast.success('Course created! Now add details to each module.')
      router.push(`/admin/courses/${data.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create course')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/courses" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/50" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold">
            Create <span className="gradient-text">New Course</span>
          </h1>
          <p className="text-white/40 text-sm">Modules will be generated automatically</p>
        </div>
      </div>

      <div className="glass-card gradient-border p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm text-white/60 mb-2 block">Course Title *</label>
            <input
              className="input-field"
              placeholder="e.g. Artificial Intelligence Fundamentals"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm text-white/60 mb-2 block">Description *</label>
            <textarea
              className="input-field resize-none h-28"
              placeholder="Describe what students will learn in this course..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm text-white/60 mb-2 block">Category</label>
            <input
              className="input-field"
              placeholder="e.g. AI & Data Science"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-white/60 mb-2 block">Thumbnail URL (optional)</label>
            <input
              className="input-field"
              placeholder="https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg"
              value={form.thumbnail}
              onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-white/60 mb-3 block">
              How many modules? *
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setForm({ ...form, moduleCount: Math.max(1, form.moduleCount - 1) })}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-3xl font-display font-bold gradient-text min-w-[60px] text-center">
                {form.moduleCount}
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, moduleCount: Math.min(20, form.moduleCount + 1) })}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-white/40 text-sm">modules</span>
            </div>
            <p className="text-white/30 text-xs mt-2">
              {form.moduleCount} module{form.moduleCount > 1 ? 's' : ''} will be created. You can add videos & questions to each module after.
            </p>
          </div>

          {/* Preview */}
          <div className="glass-card border border-purple-500/20 p-4">
            <p className="text-xs text-white/40 mb-2">Course preview</p>
            <p className="font-medium text-sm">{form.title || 'Course Title'}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {Array.from({ length: form.moduleCount }, (_, i) => (
                <span key={i} className="badge-purple text-xs">Module {i + 1}</span>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                Create Course with {form.moduleCount} Modules
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Brain, BookOpen, ArrowLeft, Plus, Minus, Loader2, Upload, Image as ImageIcon } from 'lucide-react'
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
  const [moduleNames, setModuleNames] = useState<string[]>(['Module 1', 'Module 2', 'Module 3'])

  function handleModuleCountChange(newCount: number) {
    setForm({ ...form, moduleCount: newCount })
    setModuleNames((prev) => {
      if (newCount > prev.length) {
        return [...prev, ...Array.from({ length: newCount - prev.length }, (_, i) => `Module ${prev.length + i + 1}`)]
      }
      return prev.slice(0, newCount)
    })
  }

  function updateModuleName(index: number, value: string) {
    setModuleNames((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPG, JPEG, or PNG image')
      e.target.value = ''
      return
    }

    const maxSizeBytes = 2 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      toast.error('Image must be smaller than 2MB')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setForm(prev => ({ ...prev, thumbnail: result }))
    }
    reader.onerror = () => toast.error('Failed to read image file')
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.description) return toast.error('Title and description required')
    if (form.moduleCount < 1 || form.moduleCount > 20) return toast.error('Module count must be 1-20')

    setLoading(true)
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, moduleNames }),
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
    <div className="max-w-3xl mx-auto">
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
            <label className="text-sm text-white/60 mb-2 block">Thumbnail Image (optional)</label>
            <label className="block cursor-pointer">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                className="hidden"
                onChange={handleThumbnailUpload}
              />
              <div className="input-field min-h-[88px] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {form.thumbnail ? (
                      <img src={form.thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-white/30" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white/80">
                      {form.thumbnail ? 'Thumbnail selected' : 'Upload JPG, JPEG, or PNG'}
                    </p>
                    <p className="text-xs text-white/30 mt-1">Max 2MB. Used as the course cover image.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 shrink-0">
                  <Upload className="w-4 h-4" />
                  Choose File
                </div>
              </div>
            </label>
            {form.thumbnail && (
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, thumbnail: '' }))}
                className="mt-2 text-xs text-red-300 hover:text-red-200 transition-colors"
              >
                Remove thumbnail
              </button>
            )}
          </div>

          <div>
            <label className="text-sm text-white/60 mb-3 block">
              How many modules? *
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleModuleCountChange(Math.max(1, form.moduleCount - 1))}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-3xl font-display font-bold gradient-text min-w-[60px] text-center">
                {form.moduleCount}
              </div>
              <button
                type="button"
                onClick={() => handleModuleCountChange(Math.min(20, form.moduleCount + 1))}
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

          {/* Module Names */}
          <div>
            <label className="text-sm text-white/60 mb-3 block">Module Names</label>
            <div className="space-y-2">
              {moduleNames.map((name, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-white/30 text-xs w-6 text-right shrink-0">{i + 1}.</span>
                  <input
                    className="input-field text-sm py-2"
                    placeholder={`Module ${i + 1}`}
                    value={name}
                    onChange={(e) => updateModuleName(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="glass-card border border-purple-500/20 p-4">
            <p className="text-xs text-white/40 mb-2">Course preview</p>
            <p className="font-medium text-sm">{form.title || 'Course Title'}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {moduleNames.map((name, i) => (
                <span key={i} className="badge-purple text-xs">{name || `Module ${i + 1}`}</span>
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

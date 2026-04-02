'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Save, Loader2, Link as LinkIcon, GripVertical } from 'lucide-react'
import { getYouTubeVideoId, getYouTubeThumbnail } from '@/lib/utils'
import Image from 'next/image'

interface Video {
  id: string
  title: string
  youtubeUrl: string
  order: number
}

interface Props {
  moduleId: string
  existingVideos: Video[]
  onSave: () => void
}

interface VideoForm {
  title: string
  youtubeUrl: string
  description: string
}

export default function ModuleVideoForm({ moduleId, existingVideos, onSave }: Props) {
  const [videos, setVideos] = useState<VideoForm[]>([
    { title: '', youtubeUrl: '', description: '' },
  ])
  const [loading, setLoading] = useState(false)

  function addVideo() {
    setVideos([...videos, { title: '', youtubeUrl: '', description: '' }])
  }

  function removeVideo(index: number) {
    setVideos(videos.filter((_, i) => i !== index))
  }

  function updateVideo(index: number, field: keyof VideoForm, value: string) {
    const updated = [...videos]
    updated[index] = { ...updated[index], [field]: value }
    setVideos(updated)
  }

  async function handleSave() {
    const valid = videos.filter((v) => v.title && v.youtubeUrl)
    if (valid.length === 0) return toast.error('Add at least one video with title and URL')

    // Validate YouTube URLs
    for (const v of valid) {
      if (!getYouTubeVideoId(v.youtubeUrl)) {
        return toast.error(`Invalid YouTube URL: ${v.youtubeUrl}`)
      }
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: valid.map((v, i) => ({
            title: v.title,
            youtubeUrl: v.youtubeUrl,
            description: v.description,
            order: existingVideos.length + i,
          })),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${valid.length} video(s) added!`)
      setVideos([{ title: '', youtubeUrl: '', description: '' }])
      onSave()
    } catch {
      toast.error('Failed to save videos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Existing Videos */}
      {existingVideos.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">Saved Videos</p>
          <div className="space-y-2">
            {existingVideos.map((v) => {
              const thumb = getYouTubeThumbnail(v.youtubeUrl)
              return (
                <div key={v.id} className="flex items-center gap-3 p-3 glass-card rounded-xl">
                  <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                    <img src={thumb} alt={v.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.title}</p>
                    <p className="text-xs text-white/30 truncate">{v.youtubeUrl}</p>
                  </div>
                  <span className="badge-purple text-xs flex-shrink-0">#{v.order + 1}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add New Videos */}
      <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">
        {existingVideos.length > 0 ? 'Add More Videos' : 'Add Videos'}
      </p>
      <div className="space-y-3">
        {videos.map((v, index) => (
          <div key={index} className="glass-card border border-white/8 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 font-medium">
                Video {existingVideos.length + index + 1}
              </span>
              {videos.length > 1 && (
                <button
                  onClick={() => removeVideo(index)}
                  className="p-1 rounded-lg hover:bg-zinc-500/20 text-white/30 hover:text-zinc-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid gap-3">
              <input
                className="input-field text-sm"
                placeholder="Video title"
                value={v.title}
                onChange={(e) => updateVideo(index, 'title', e.target.value)}
              />
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  className="input-field text-sm pl-9"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={v.youtubeUrl}
                  onChange={(e) => updateVideo(index, 'youtubeUrl', e.target.value)}
                />
              </div>
              {v.youtubeUrl && getYouTubeVideoId(v.youtubeUrl) && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  Valid YouTube URL detected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button onClick={addVideo} className="btn-secondary flex items-center gap-2 text-sm py-2.5">
          <Plus className="w-4 h-4" /> Add Another Video
        </button>
        <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2 text-sm py-2.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Videos
        </button>
      </div>
    </div>
  )
}

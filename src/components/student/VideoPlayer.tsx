'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getYouTubeVideoId, getYouTubeEmbedUrl } from '@/lib/utils'
import { CheckCircle, Eye } from 'lucide-react'

interface Video {
  id: string
  title: string
  youtubeUrl: string
}

interface Props {
  video: Video
  onWatched: () => void
  isWatched: boolean
}

export default function VideoPlayer({ video, onWatched, isWatched }: Props) {
  const [watched, setWatched] = useState(isWatched)
  const embedUrl = getYouTubeEmbedUrl(video.youtubeUrl)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Sync watched state when isWatched prop changes (e.g. after re-fetch)
  useEffect(() => {
    setWatched(isWatched)
  }, [isWatched, video.id])

  // Listen for YouTube iframe API postMessage events
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      try {
        // YouTube sends JSON stringified data
        if (typeof event.data !== 'string') return
        const data = JSON.parse(event.data)
        // YouTube player state: 0 = ended
        if (data.event === 'onStateChange' && data.info === 0 && !watched) {
          setWatched(true)
          onWatched()
        }
      } catch {
        // ignore non-JSON messages
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [watched, onWatched])

  function handleMarkWatched() {
    setWatched(true)
    onWatched()
  }

  // Enable YouTube JS API by adding enablejsapi=1
  const embedWithApi = embedUrl + (embedUrl.includes('?') ? '&' : '?') + 'enablejsapi=1&origin=' + (typeof window !== 'undefined' ? window.location.origin : '')

  return (
    <div className="glass-card overflow-hidden">
      {/* YouTube embed */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          ref={iframeRef}
          className="absolute inset-0 w-full h-full"
          src={embedWithApi}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Video info */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">{video.title}</h3>
        </div>
        {watched ? (
          <div className="flex items-center gap-2 text-green-400 text-sm flex-shrink-0">
            <CheckCircle className="w-4 h-4" /> Watched
          </div>
        ) : (
          <button
            onClick={handleMarkWatched}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-sm hover:bg-purple-500/30 transition-all flex-shrink-0"
          >
            <Eye className="w-4 h-4" /> Mark as Watched
          </button>
        )}
      </div>
    </div>
  )
}

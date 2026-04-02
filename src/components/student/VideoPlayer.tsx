'use client'

import { useState, useEffect, useRef } from 'react'
import { getYouTubeVideoId } from '@/lib/utils'
import { CheckCircle, Clock, Sparkles } from 'lucide-react'

interface CheckpointQuestion {
  id: string
  text: string
  timestamp: number // seconds
  explanation: string | null
  options: { id: string; text: string; isCorrect: boolean }[]
}

interface Video {
  id: string
  title: string
  youtubeUrl: string
}

interface Props {
  video: Video
  onWatched: () => void
  isWatched: boolean
  checkpoints?: CheckpointQuestion[]
}

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: Record<string, unknown>) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTPlayer {
  getCurrentTime: () => number
  pauseVideo: () => void
  playVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  destroy: () => void
  getPlayerState: () => number
}

// Load YouTube IFrame API script once
let ytApiLoaded = false
let ytApiReady = false
const ytApiCallbacks: (() => void)[] = []

function loadYTApi() {
  if (ytApiReady) return Promise.resolve()
  return new Promise<void>((resolve) => {
    if (ytApiLoaded) {
      ytApiCallbacks.push(resolve)
      return
    }
    ytApiLoaded = true
    ytApiCallbacks.push(resolve)
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => {
      ytApiReady = true
      ytApiCallbacks.forEach((cb) => cb())
      ytApiCallbacks.length = 0
    }
  })
}

export default function VideoPlayer({ video, onWatched, isWatched, checkpoints = [] }: Props) {
  const [watched, setWatched] = useState(isWatched)
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [activeCheckpoint, setActiveCheckpoint] = useState<CheckpointQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [checkpointAnswered, setCheckpointAnswered] = useState(false)
  const [checkpointCorrect, setCheckpointCorrect] = useState(false)
  const answeredCheckpointsRef = useRef<Set<string>>(new Set())
  const maxWatchedTimeRef = useRef<number>(0)
  const seekCheckBlockedRef = useRef<boolean>(false)
  const playerContainerId = `yt-player-${video.id}`

  useEffect(() => {
    setWatched(isWatched)
  }, [isWatched, video.id])

  // Reset checkpoint state on video change
  useEffect(() => {
    setActiveCheckpoint(null)
    setSelectedOption(null)
    setCheckpointAnswered(false)
    answeredCheckpointsRef.current = new Set()
    maxWatchedTimeRef.current = 0
  }, [video.id])

  // Initialize YouTube IFrame API player
  useEffect(() => {
    const videoId = getYouTubeVideoId(video.youtubeUrl)
    if (!videoId) return

    let destroyed = false

    async function init() {
      await loadYTApi()
      if (destroyed) return

      // Small delay to ensure the DOM element exists
      await new Promise((r) => setTimeout(r, 100))
      if (destroyed) return

      const el = document.getElementById(playerContainerId)
      if (!el) return

      playerRef.current = new window.YT.Player(playerContainerId, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          disablekb: 1, // Disable keyboard controls (arrow keys to seek)
          controls: 0,  // Hide YouTube controls (removes gear/settings icon)
        },
        events: {
          onStateChange: (event: { data: number }) => {
            // Video ended — only mark as watched if they actually reached the end naturally
            if (event.data === 0 && !watched) {
              setWatched(true)
              onWatched()
            }
          },
        },
      })

      // Poll current time for checkpoint detection AND anti-skip enforcement
      intervalRef.current = setInterval(() => {
        if (!playerRef.current || destroyed) return
        try {
          const state = playerRef.current.getPlayerState()
          if (state !== 1) return // Only check during PLAYING state

          const currentTime = playerRef.current.getCurrentTime()

          // Anti-skip: if user seeks ahead of max watched time, snap back
          if (currentTime > maxWatchedTimeRef.current + 2) {
            if (!seekCheckBlockedRef.current) {
              seekCheckBlockedRef.current = true
              playerRef.current.seekTo(maxWatchedTimeRef.current, true)
              setTimeout(() => { seekCheckBlockedRef.current = false }, 500)
            }
            return
          }

          // Update max watched time (only moves forward naturally)
          if (currentTime > maxWatchedTimeRef.current) {
            maxWatchedTimeRef.current = currentTime
          }

          // Check for checkpoint questions
          if (checkpoints.length > 0) {
            for (const cp of checkpoints) {
              if (
                !answeredCheckpointsRef.current.has(cp.id) &&
                currentTime >= cp.timestamp &&
                currentTime < cp.timestamp + 1.5
              ) {
                playerRef.current.pauseVideo()
                setActiveCheckpoint(cp)
                setSelectedOption(null)
                setCheckpointAnswered(false)
                break
              }
            }
          }
        } catch {
          // Player may not be ready yet
        }
      }, 500)
    }

    init()

    return () => {
      destroyed = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (playerRef.current) {
        try { playerRef.current.destroy() } catch { /* ignore */ }
        playerRef.current = null
      }
    }
  }, [video.id, video.youtubeUrl, checkpoints])

  function handleCheckpointAnswer() {
    if (!activeCheckpoint || !selectedOption) return
    const correct = activeCheckpoint.options.find((o) => o.id === selectedOption)?.isCorrect
    setCheckpointCorrect(!!correct)
    setCheckpointAnswered(true)
    if (correct) {
      answeredCheckpointsRef.current.add(activeCheckpoint.id)
    }
  }

  function handleCheckpointContinue() {
    if (checkpointCorrect) {
      setActiveCheckpoint(null)
      // Resume video
      if (playerRef.current) {
        playerRef.current.playVideo()
      }
    } else {
      // Wrong answer — restart video from beginning, reset all checkpoint progress
      setActiveCheckpoint(null)
      setSelectedOption(null)
      setCheckpointAnswered(false)
      answeredCheckpointsRef.current = new Set()
      maxWatchedTimeRef.current = 0
      if (playerRef.current) {
        playerRef.current.seekTo(0, true)
        playerRef.current.playVideo()
      }
    }
  }

  // Update the wrong-answer button text to indicate restart

  return (
    <div className="glass-card overflow-hidden">
      {/* YouTube player container */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }} ref={containerRef}>
        <div id={playerContainerId} className="absolute inset-0 w-full h-full" />
        {/* Transparent overlay to block seeking via progress bar click */}
        {!watched && (
          <div
            className="absolute bottom-0 left-0 right-0 h-10 z-[5]"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => e.preventDefault()}
          />
        )}

        {/* Checkpoint Question Overlay */}
        {activeCheckpoint && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10 p-4">
            <div className="w-full max-w-lg glass-card border border-purple-500/30 p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-purple-300">Checkpoint Question</p>
                  <p className="text-xs text-white/40">
                    {Math.floor(activeCheckpoint.timestamp / 60)}:{String(activeCheckpoint.timestamp % 60).padStart(2, '0')} — Answer correctly to continue
                  </p>
                </div>
              </div>

              <p className="text-sm font-medium mb-3">{activeCheckpoint.text}</p>

              <div className="space-y-2">
                {activeCheckpoint.options.map((opt) => {
                  let optClass = 'bg-white/5 border-white/10 hover:bg-white/10'
                  if (checkpointAnswered && opt.isCorrect) {
                    optClass = 'bg-green-500/20 border-green-500/40 text-green-300'
                  } else if (checkpointAnswered && selectedOption === opt.id && !opt.isCorrect) {
                    optClass = 'bg-red-500/20 border-red-500/40 text-red-300'
                  } else if (selectedOption === opt.id) {
                    optClass = 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                  }
                  return (
                    <button
                      key={opt.id}
                      onClick={() => { if (!checkpointAnswered) setSelectedOption(opt.id) }}
                      className={`w-full text-left text-sm px-4 py-2.5 rounded-xl border transition-all ${optClass}`}
                    >
                      {opt.text}
                    </button>
                  )
                })}
              </div>

              {checkpointAnswered && activeCheckpoint.explanation && (
                <p className="text-xs text-cyan-300/70 mt-3 flex items-start gap-1.5">
                  <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {activeCheckpoint.explanation}
                </p>
              )}

              <div className="mt-4">
                {!checkpointAnswered ? (
                  <button
                    onClick={handleCheckpointAnswer}
                    disabled={!selectedOption}
                    className="btn-primary w-full text-sm py-2.5 disabled:opacity-40"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={handleCheckpointContinue}
                    className={`w-full text-sm py-2.5 rounded-xl font-medium transition-all ${
                      checkpointCorrect
                        ? 'bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30'
                        : 'bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30'
                    }`}
                  >
                    {checkpointCorrect ? '✓ Correct! Continue watching' : '✗ Wrong — Restart video from beginning'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video info */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">{video.title}</h3>
          {checkpoints.length > 0 && (
            <p className="text-xs text-purple-300/50 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {checkpoints.length} checkpoint{checkpoints.length > 1 ? 's' : ''} in this video
            </p>
          )}
        </div>
        {watched ? (
          <div className="flex items-center gap-2 text-green-400 text-sm flex-shrink-0">
            <CheckCircle className="w-4 h-4" /> Watched
          </div>
        ) : (
          <div className="flex items-center gap-2 text-white/40 text-sm flex-shrink-0">
            <Clock className="w-4 h-4" /> Watch fully to complete
          </div>
        )}
      </div>
    </div>
  )
}

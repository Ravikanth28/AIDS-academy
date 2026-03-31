'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, PlayCircle, CheckCircle, Lock, ClipboardList, ChevronRight, Loader2, Trophy
} from 'lucide-react'
import VideoPlayer from '@/components/student/VideoPlayer'

interface Video {
  id: string
  title: string
  youtubeUrl: string
  order: number
}

interface Module {
  id: string
  title: string
  description: string
  order: number
  passingScore: number
  questionCount: number
  videos: Video[]
  _count: { questions: number }
}

interface ModuleProgress {
  moduleId: string
  videoCompleted: boolean
  testPassed: boolean
  testScore: number | null
  videosWatched: string[]
}

interface EnrollmentData {
  id: string
  course: {
    id: string
    title: string
    modules: Module[]
  }
  moduleProgress: ModuleProgress[]
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

  useEffect(() => {
    fetchEnrollment()
  }, [courseId])

  async function fetchEnrollment() {
    try {
      const res = await fetch(`/api/student/course/${courseId}`)
      if (!res.ok) { router.push('/dashboard/courses'); return }
      const data = await res.json()
      setEnrollment(data)

      // Check if we should auto-select a specific module (coming from test results)
      const nextModuleId = sessionStorage.getItem('nextModuleId')
      if (nextModuleId) {
        sessionStorage.removeItem('nextModuleId')
        const nextMod = data.course.modules.find((m: Module) => m.id === nextModuleId)
        if (nextMod) {
          setSelectedModule(nextMod)
          if (nextMod.videos.length > 0) setSelectedVideo(nextMod.videos[0])
          return
        }
      }

      // Auto-select first unlocked module
      const firstUnlocked = getFirstUnlockedModule(data)
      if (firstUnlocked) {
        setSelectedModule(firstUnlocked)
        if (firstUnlocked.videos.length > 0) setSelectedVideo(firstUnlocked.videos[0])
      }
    } finally {
      setLoading(false)
    }
  }

  function getProgress(moduleId: string): ModuleProgress | undefined {
    return enrollment?.moduleProgress.find((p) => p.moduleId === moduleId)
  }

  function isModuleUnlocked(module: Module): boolean {
    if (!enrollment) return false
    const modules = enrollment.course.modules.sort((a, b) => a.order - b.order)
    if (module.order === 1) return true
    const prevModule = modules.find((m) => m.order === module.order - 1)
    if (!prevModule) return true
    const prevProgress = getProgress(prevModule.id)
    return prevProgress?.testPassed === true
  }

  function getFirstUnlockedModule(data: EnrollmentData): Module | null {
    const sorted = [...data.course.modules].sort((a, b) => a.order - b.order)
    for (const mod of sorted) {
      const progress = data.moduleProgress.find((p) => p.moduleId === mod.id)
      if (!progress?.testPassed) {
        // Check if unlocked
        if (mod.order === 1) return mod
        const prevMod = sorted.find((m) => m.order === mod.order - 1)
        if (prevMod) {
          const prevProgress = data.moduleProgress.find((p) => p.moduleId === prevMod.id)
          if (prevProgress?.testPassed) return mod
        }
      }
    }
    return null
  }

  async function handleVideoWatched(videoId: string) {
    if (!selectedModule || !enrollment) return
    try {
      const res = await fetch('/api/student/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          moduleId: selectedModule.id,
          courseId,
        }),
      })
      const data = await res.json()
      if (data.videoCompleted) {
        toast.success('🎉 All videos watched! You can now take the test.')
      } else {
        // Auto-advance to next unwatched video
        const currentIndex = selectedModule.videos.findIndex((v) => v.id === videoId)
        const nextVideo = selectedModule.videos[currentIndex + 1]
        if (nextVideo) {
          setSelectedVideo(nextVideo)
        }
      }
      await fetchEnrollment()
    } catch {
      // silent
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )

  if (!enrollment) return null

  const allModulesDone = enrollment.course.modules.every((m) => getProgress(m.id)?.testPassed)
  const completedModules = enrollment.moduleProgress.filter((p) => p.testPassed).length
  const totalModules = enrollment.course.modules.length
  const courseProgressPct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/50" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold truncate">{enrollment.course.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-white/40 text-sm">
              {completedModules}/{totalModules} modules complete
            </p>
            <div className="flex-1 max-w-xs h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${courseProgressPct}%` }}
              />
            </div>
            <span className="text-xs text-white/30">{courseProgressPct}%</span>
          </div>
        </div>
      </div>

      {/* All done banner */}
      {allModulesDone && (
        <div className="glass-card border border-amber-500/30 bg-amber-500/10 p-5 mb-6 flex items-center gap-4">
          <Trophy className="w-8 h-8 text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-300">Course Complete! 🎉</p>
            <p className="text-sm text-amber-300/70">Congratulations! Your certificate has been issued.</p>
          </div>
          <Link href="/dashboard/certificates" className="btn-primary ml-auto text-sm py-2 flex-shrink-0">
            View Certificate
          </Link>
        </div>
      )}

      <div className="flex gap-6">
        {/* Module List - Left Sidebar */}
        <div className="w-72 xl:w-80 flex-shrink-0">
          <div className="sticky top-6">
            <h2 className="font-display font-semibold mb-3 text-white/70 text-sm uppercase tracking-wider">Modules</h2>
            <div className="space-y-2">
              {enrollment.course.modules.sort((a, b) => a.order - b.order).map((mod) => {
                const progress = getProgress(mod.id)
                const unlocked = isModuleUnlocked(mod)
                const isSelected = selectedModule?.id === mod.id
                const videosWatched = progress?.videosWatched?.length ?? 0
                const totalVids = mod.videos.length
                const vidProgressPct = totalVids > 0 ? Math.round((videosWatched / totalVids) * 100) : 0

                return (
                  <div
                    key={mod.id}
                    className={`rounded-xl transition-all duration-200 border overflow-hidden
                      ${isSelected
                        ? 'bg-purple-500/20 border-purple-500/40'
                        : unlocked
                        ? 'bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/10'
                        : 'bg-white/2 border-white/5 opacity-50'}`}
                  >
                    {/* Module header */}
                    <button
                      onClick={() => {
                        if (!unlocked) { toast.error('Complete the previous module first!'); return }
                        if (isSelected) { setSelectedModule(null); setSelectedVideo(null); return }
                        setSelectedModule(mod)
                        setSelectedVideo(mod.videos[0] || null)
                      }}
                      className={`w-full text-left p-3.5 ${!unlocked ? 'cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${progress?.testPassed
                            ? 'bg-green-500/20 text-green-300'
                            : unlocked
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-white/5 text-white/30'}`}
                        >
                          {progress?.testPassed ? <CheckCircle className="w-4 h-4" /> : unlocked ? mod.order : <Lock className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{mod.title}</p>
                          <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                            <span>{mod.videos.length} videos</span>
                            {progress?.videoCompleted && !progress.testPassed && (
                              <span className="text-amber-400">Test available</span>
                            )}
                            {progress?.testPassed && (
                              <span className="text-green-400">{Math.round(progress.testScore || 0)}%</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-white/20 flex-shrink-0 transition-transform duration-200 ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                      {/* Module progress bar */}
                      {totalVids > 0 && (
                        <div className="mt-2.5 ml-12">
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                progress?.testPassed
                                  ? 'bg-green-500/60'
                                  : unlocked
                                  ? 'bg-purple-500/60'
                                  : 'bg-white/10'
                              }`}
                              style={{ width: `${progress?.testPassed ? 100 : vidProgressPct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-white/25 mt-1">
                            {progress?.testPassed ? `${totalVids}/${totalVids} complete` : `${videosWatched}/${totalVids} watched`}
                          </p>
                        </div>
                      )}
                    </button>

                    {/* Expanded video playlist */}
                    {isSelected && mod.videos.length > 0 && (
                      <div className="border-t border-white/5 px-3 pb-3 pt-2 space-y-1">
                        {mod.videos.map((video, idx) => {
                          const vWatched = progress?.videosWatched?.includes(video.id) ?? false
                          const isCurrent = selectedVideo?.id === video.id
                          return (
                            <button
                              key={video.id}
                              onClick={() => setSelectedVideo(video)}
                              className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all
                                ${isCurrent
                                  ? 'bg-purple-500/25 border border-purple-500/40'
                                  : 'hover:bg-white/5 border border-transparent'}`}
                            >
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs
                                ${vWatched ? 'bg-green-500/20' : isCurrent ? 'bg-purple-500/20' : 'bg-white/5'}`}>
                                {vWatched ? (
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                ) : isCurrent ? (
                                  <PlayCircle className="w-3 h-3 text-purple-400" />
                                ) : (
                                  <span className="text-white/30 text-[10px]">{idx + 1}</span>
                                )}
                              </div>
                              <p className={`text-xs leading-snug line-clamp-2 ${isCurrent ? 'text-purple-200' : 'text-white/50'}`}>
                                {video.title}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content Area - Right (fills remaining space) */}
        <div className="flex-1 min-w-0">
          {selectedModule ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg">
                  Module {selectedModule.order}: {selectedModule.title}
                </h2>
                {/* Test button */}
                {getProgress(selectedModule.id)?.videoCompleted && (
                  <Link
                    href={`/dashboard/courses/${courseId}/test/${selectedModule.id}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                      ${getProgress(selectedModule.id)?.testPassed
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'btn-primary'}`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    {getProgress(selectedModule.id)?.testPassed ? 'Retake Test' : 'Take Test'}
                  </Link>
                )}
              </div>

              {/* Video Player */}
              {selectedVideo && (
                <VideoPlayer
                  key={selectedVideo.id}
                  video={selectedVideo}
                  onWatched={() => handleVideoWatched(selectedVideo.id)}
                  isWatched={getProgress(selectedModule.id)?.videosWatched?.includes(selectedVideo.id) ?? false}
                />
              )}

              {/* Take test prompt */}
              {!getProgress(selectedModule.id)?.videoCompleted && selectedModule.videos.length > 0 && (
                <div className="glass-card border border-amber-500/20 bg-amber-500/5 p-4 mt-5 text-sm text-amber-300/80 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-300 text-sm">Module Test Locked</p>
                    <p className="text-amber-300/60 text-xs mt-0.5">Watch all videos to unlock the module test</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-16 text-center">
              <PlayCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Select a module to start learning</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

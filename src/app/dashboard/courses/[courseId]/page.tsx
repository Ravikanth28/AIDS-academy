'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, PlayCircle, CheckCircle, Lock, ClipboardList, ChevronRight, Loader2, Trophy,
  Sparkles, FileText, Download, Brain, BookOpen, ExternalLink, Github, Database, FileSpreadsheet, Presentation
} from 'lucide-react'
import VideoPlayer from '@/components/student/VideoPlayer'
import dynamic from 'next/dynamic'

const MindMap = dynamic(() => import('@/components/student/MindMap'), { ssr: false })

interface Video {
  id: string
  title: string
  youtubeUrl: string
  order: number
  checkpointQuestions?: Array<{
    id: string
    text: string
    timestamp: number
    explanation: string | null
    options: Array<{ id: string; text: string; isCorrect: boolean }>
  }>
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
  const courseId = params?.courseId as string
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [aiQuestions, setAiQuestions] = useState<Array<{text: string; explanation: string; options: Array<{text: string; isCorrect: boolean}>}>>([])
  const [aiNotes, setAiNotes] = useState('')
  const [loadingMcq, setLoadingMcq] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showAiQuiz, setShowAiQuiz] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [resources, setResources] = useState<Array<{type: string; title: string; url: string; description: string; source: string}>>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [showResources, setShowResources] = useState(false)
  const [mindmapData, setMindmapData] = useState<{central: string; branches: Array<{label: string; children?: Array<{label: string; children?: Array<{label: string}>}>}>} | null>(null)
  const [loadingMindmap, setLoadingMindmap] = useState(false)
  const [showMindmap, setShowMindmap] = useState(false)
  const [checkpoints, setCheckpoints] = useState<Array<{id: string; text: string; timestamp: number; explanation: string | null; options: Array<{id: string; text: string; isCorrect: boolean}>}>>([])

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

  async function handleGenerateMcq() {
    if (!selectedModule) return
    setLoadingMcq(true)
    setAiQuestions([])
    setSelectedAnswers({})
    setQuizSubmitted(false)
    try {
      const res = await fetch(`/api/student/generate-mcq/${selectedModule.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 5 }),
      })
      if (!res.ok) throw new Error('Failed to generate questions')
      const data = await res.json()
      setAiQuestions(data.questions)
      setShowAiQuiz(true)
      toast.success('AI questions generated!')
    } catch {
      toast.error('Could not generate questions. Transcript may be unavailable.')
    } finally {
      setLoadingMcq(false)
    }
  }

  async function handleGenerateNotes() {
    if (!selectedModule) return
    setLoadingNotes(true)
    setAiNotes('')
    try {
      const res = await fetch(`/api/student/generate-notes/${selectedModule.id}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to generate notes')
      const data = await res.json()
      setAiNotes(data.notes)
      setShowNotes(true)
      toast.success('Notes generated!')
    } catch {
      toast.error('Could not generate notes. Transcript may be unavailable.')
    } finally {
      setLoadingNotes(false)
    }
  }

  function downloadNotes() {
    if (!aiNotes || !selectedModule) return
    const blob = new Blob([aiNotes], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedModule.title.replace(/[^a-zA-Z0-9]/g, '_')}_notes.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFindResources() {
    if (!selectedModule) return
    setLoadingResources(true)
    setResources([])
    try {
      const res = await fetch(`/api/student/resources/${selectedModule.id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to find resources')
      const data = await res.json()
      setResources(data.resources)
      setShowResources(true)
      toast.success('Resources found!')
    } catch {
      toast.error('Could not find resources.')
    } finally {
      setLoadingResources(false)
    }
  }

  function getResourceIcon(type: string) {
    switch (type) {
      case 'github': return <Github className="w-4 h-4" />
      case 'dataset': return <Database className="w-4 h-4" />
      case 'notebook': return <FileSpreadsheet className="w-4 h-4" />
      case 'slides': case 'presentation': return <Presentation className="w-4 h-4" />
      case 'pdf': case 'article': return <FileText className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  function getResourceColor(type: string) {
    switch (type) {
      case 'github': return 'text-gray-300 bg-gray-500/15 border-gray-500/30'
      case 'dataset': return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
      case 'notebook': return 'text-orange-300 bg-orange-500/15 border-orange-500/30'
      case 'slides': case 'presentation': return 'text-blue-300 bg-blue-500/15 border-blue-500/30'
      case 'pdf': return 'text-zinc-300 bg-zinc-500/15 border-zinc-500/30'
      case 'article': case 'tutorial': return 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30'
      default: return 'text-purple-300 bg-purple-500/15 border-purple-500/30'
    }
  }

  async function handleGenerateMindmap() {
    if (!selectedModule) return
    setLoadingMindmap(true)
    setMindmapData(null)
    try {
      const res = await fetch(`/api/student/mindmap/${selectedModule.id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate mind map')
      const data = await res.json()
      setMindmapData(data.mindmap)
      setShowMindmap(true)
      toast.success('Mind map generated!')
    } catch {
      toast.error('Could not generate mind map.')
    } finally {
      setLoadingMindmap(false)
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
                {getProgress(selectedModule.id)?.videoCompleted && selectedModule._count.questions > 0 && (
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
                {getProgress(selectedModule.id)?.videoCompleted && selectedModule._count.questions === 0 && (
                  <span className="text-xs text-white/30 italic">No test questions yet</span>
                )}
              </div>

              {/* Video Player */}
              {selectedVideo && (
                <VideoPlayer
                  key={selectedVideo.id}
                  video={selectedVideo}
                  onWatched={() => handleVideoWatched(selectedVideo.id)}
                  isWatched={getProgress(selectedModule.id)?.videosWatched?.includes(selectedVideo.id) ?? false}
                  checkpoints={selectedVideo.checkpointQuestions}
                />
              )}

              {/* AI Tools Section */}
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={handleGenerateMcq}
                  disabled={loadingMcq}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded-xl text-sm hover:bg-purple-500/25 transition-all disabled:opacity-50"
                >
                  {loadingMcq ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  AI Practice Quiz
                </button>
                <button
                  onClick={handleGenerateNotes}
                  disabled={loadingNotes}
                  className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 rounded-xl text-sm hover:bg-cyan-500/25 transition-all disabled:opacity-50"
                >
                  {loadingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  AI Study Notes
                </button>
                <button
                  onClick={handleFindResources}
                  disabled={loadingResources}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                >
                  {loadingResources ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                  Find Resources
                </button>
                <button
                  onClick={handleGenerateMindmap}
                  disabled={loadingMindmap}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl text-sm hover:bg-amber-500/25 transition-all disabled:opacity-50"
                >
                  {loadingMindmap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  Mind Map
                </button>
              </div>

              {/* AI Practice Quiz Panel */}
              {showAiQuiz && aiQuestions.length > 0 && (
                <div className="glass-card border border-purple-500/20 p-5 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" /> AI Practice Quiz
                    </h3>
                    <button onClick={() => { setShowAiQuiz(false); setAiQuestions([]); setQuizSubmitted(false); setSelectedAnswers({}) }} className="text-white/40 hover:text-white/60 text-sm">Close</button>
                  </div>
                  <div className="space-y-5">
                    {aiQuestions.map((q, qi) => (
                      <div key={qi} className="border-b border-white/5 pb-4 last:border-0">
                        <p className="text-sm font-medium mb-2">{qi + 1}. {q.text}</p>
                        <div className="space-y-1.5 ml-2">
                          {q.options.map((opt, oi) => {
                            const isSelected = selectedAnswers[qi] === oi
                            const showResult = quizSubmitted
                            let optClass = 'bg-white/3 border-white/10 hover:bg-white/6'
                            if (showResult && opt.isCorrect) optClass = 'bg-green-500/15 border-green-500/40 text-green-300'
                            else if (showResult && isSelected && !opt.isCorrect) optClass = 'bg-red-500/15 border-red-500/40 text-red-300'
                            else if (isSelected) optClass = 'bg-purple-500/15 border-purple-500/40'
                            return (
                              <button
                                key={oi}
                                onClick={() => { if (!quizSubmitted) setSelectedAnswers(prev => ({ ...prev, [qi]: oi })) }}
                                className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all ${optClass}`}
                              >
                                {opt.text}
                              </button>
                            )
                          })}
                        </div>
                        {quizSubmitted && q.explanation && (
                          <p className="text-xs text-cyan-300/70 mt-2 ml-2">💡 {q.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {!quizSubmitted ? (
                    <button
                      onClick={() => setQuizSubmitted(true)}
                      disabled={Object.keys(selectedAnswers).length < aiQuestions.length}
                      className="btn-primary mt-4 text-sm py-2 disabled:opacity-40"
                    >
                      Check Answers
                    </button>
                  ) : (
                    <div className="mt-4 flex items-center gap-3">
                      <p className="text-sm text-white/60">
                        Score: {aiQuestions.filter((q, i) => q.options[selectedAnswers[i]]?.isCorrect).length}/{aiQuestions.length}
                      </p>
                      <button onClick={handleGenerateMcq} className="text-sm text-purple-400 hover:text-purple-300">Generate New</button>
                    </div>
                  )}
                </div>
              )}

              {/* AI Notes Panel */}
              {showNotes && aiNotes && (
                <div className="glass-card border border-cyan-500/20 p-5 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" /> AI Study Notes
                    </h3>
                    <div className="flex items-center gap-2">
                      <button onClick={downloadNotes} className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300">
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                      <button onClick={() => setShowNotes(false)} className="text-white/40 hover:text-white/60 text-sm ml-2">Close</button>
                    </div>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none text-white/80 whitespace-pre-wrap text-sm leading-relaxed">
                    {aiNotes}
                  </div>
                </div>
              )}

              {/* Resources Panel */}
              {showResources && resources.length > 0 && (
                <div className="glass-card border border-emerald-500/20 p-5 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-400" /> Learning Resources
                    </h3>
                    <button onClick={() => setShowResources(false)} className="text-white/40 hover:text-white/60 text-sm">Close</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {resources.map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02] ${getResourceColor(r.type)}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {getResourceIcon(r.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            {r.title}
                            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
                          </p>
                          <p className="text-xs opacity-70 mt-0.5 line-clamp-2">{r.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] uppercase tracking-wider opacity-50">{r.type}</span>
                            <span className="text-[10px] opacity-40">•</span>
                            <span className="text-[10px] opacity-50">{r.source}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Mind Map */}
              {showMindmap && mindmapData && (
                <MindMap data={mindmapData} onClose={() => setShowMindmap(false)} />
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

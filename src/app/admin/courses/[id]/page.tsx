'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, BookOpen, PlayCircle, HelpCircle, Plus, ChevronDown, ChevronUp,
  Save, Loader2, Video, CheckCircle, Pencil
} from 'lucide-react'
import ModuleVideoForm from '@/components/admin/ModuleVideoForm'
import ModuleQuestionsPanel from '@/components/admin/ModuleQuestionsPanel'

interface Video { id: string; title: string; youtubeUrl: string; order: number }
interface Module {
  id: string; title: string; description: string; order: number;
  passingScore: number; questionCount: number
  videos: Video[]
  _count: { questions: number }
}
interface Course {
  id: string; title: string; description: string; category: string;
  isPublished: boolean; modules: Module[]
}

export default function CourseManagePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [openModule, setOpenModule] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<{ [key: string]: 'videos' | 'questions' }>({})

  useEffect(() => {
    fetchCourse()
  }, [courseId])

  async function fetchCourse() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`)
      const data = await res.json()
      if (!res.ok) { toast.error('Course not found'); router.push('/admin/courses'); return }
      setCourse(data)
    } finally {
      setLoading(false)
    }
  }

  function toggleModule(id: string) {
    setOpenModule(openModule === id ? null : id)
    if (!activeTab[id]) setActiveTab({ ...activeTab, [id]: 'videos' })
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )
  if (!course) return null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-8">
        <Link href="/admin/courses" className="p-2 rounded-xl hover:bg-white/5 transition-colors mt-1">
          <ArrowLeft className="w-5 h-5 text-white/50" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold">{course.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge-${course.isPublished ? 'green' : 'red'} text-xs`}>
              {course.isPublished ? 'Published' : 'Draft'}
            </span>
            <span className="text-white/40 text-sm">{course.modules.length} modules</span>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {course.modules.map((mod) => (
          <div key={mod.id} className="glass-card overflow-hidden">
            {/* Module Header */}
            <button
              onClick={() => toggleModule(mod.id)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/3 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-300 flex-shrink-0">
                {mod.order}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{mod.title}</div>
                <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                  <span className="flex items-center gap-1">
                    <PlayCircle className="w-3 h-3" /> {mod.videos.length} videos
                  </span>
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" /> {mod._count.questions} questions
                  </span>
                  <span>Pass: {mod.passingScore}%</span>
                  <span>Show: {mod.questionCount} Qs</span>
                </div>
              </div>
              {/* Status badges */}
              <div className="flex items-center gap-1.5">
                {mod.videos.length > 0 && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {mod._count.questions > 0 && (
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              {openModule === mod.id ? (
                <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
              )}
            </button>

            {/* Module Content */}
            {openModule === mod.id && (
              <div className="border-t border-white/5 p-5">
                {/* Tab selector */}
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => setActiveTab({ ...activeTab, [mod.id]: 'videos' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                      ${activeTab[mod.id] === 'videos'
                        ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                        : 'bg-white/5 text-white/50 hover:text-white'}`}
                  >
                    <Video className="w-4 h-4" /> Videos ({mod.videos.length})
                  </button>
                  <button
                    onClick={() => setActiveTab({ ...activeTab, [mod.id]: 'questions' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                      ${activeTab[mod.id] === 'questions'
                        ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300'
                        : 'bg-white/5 text-white/50 hover:text-white'}`}
                  >
                    <HelpCircle className="w-4 h-4" /> Questions ({mod._count.questions})
                  </button>
                </div>

                {activeTab[mod.id] === 'videos' ? (
                  <ModuleVideoForm moduleId={mod.id} existingVideos={mod.videos} onSave={fetchCourse} />
                ) : (
                  <ModuleQuestionsPanel
                    moduleId={mod.id}
                    passingScore={mod.passingScore}
                    questionCount={mod.questionCount}
                    onSave={fetchCourse}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

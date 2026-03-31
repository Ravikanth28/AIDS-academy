import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

// POST: Mark a video as watched
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const { videoId, moduleId, courseId } = await req.json()
  if (!videoId || !moduleId || !courseId) {
    return NextResponse.json({ error: 'videoId, moduleId, courseId required' }, { status: 400 })
  }

  // Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session!.userId, courseId } },
  })
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  // Get or create module progress
  let progress = await prisma.moduleProgress.findUnique({
    where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
  })

  // Get total videos in module
  const totalVideos = await prisma.video.count({ where: { moduleId } })

  let videosWatched = progress?.videosWatched ?? []
  if (!videosWatched.includes(videoId)) {
    videosWatched = [...videosWatched, videoId]
  }
  const videoCompleted = videosWatched.length >= totalVideos

  if (progress) {
    progress = await prisma.moduleProgress.update({
      where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
      data: { videosWatched, videoCompleted },
    })
  } else {
    progress = await prisma.moduleProgress.create({
      data: {
        enrollmentId: enrollment.id,
        moduleId,
        videosWatched,
        videoCompleted,
      },
    })
  }

  return NextResponse.json({ progress, videoCompleted })
}

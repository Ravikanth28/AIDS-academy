import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

// Add videos to a module
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const body = await req.json()
  const { videos } = body // [{ title, youtubeUrl, description, order }]

  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    return NextResponse.json({ error: 'Videos array required' }, { status: 400 })
  }

  // Validate module exists
  const module_ = await prisma.module.findUnique({ where: { id: params.id } })
  if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const created = await prisma.$transaction(
    videos.map((v, i) =>
      prisma.video.create({
        data: {
          title: v.title,
          youtubeUrl: v.youtubeUrl,
          description: v.description || '',
          order: v.order ?? i,
          moduleId: params.id,
        },
      })
    )
  )

  return NextResponse.json(created, { status: 201 })
}

// GET videos for a module
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const videos = await prisma.video.findMany({
    where: { moduleId: params.id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(videos)
}

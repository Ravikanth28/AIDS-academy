import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

// GET: load existing draft for this user+module
export async function GET(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const draft = await prisma.codingDraft.findUnique({
    where: { userId_moduleId: { userId: session!.userId, moduleId: params.moduleId } },
  })
  if (!draft) return NextResponse.json({ solutions: {}, languages: {} })

  try {
    return NextResponse.json({
      solutions: JSON.parse(draft.solutions),
      languages: JSON.parse(draft.languages),
    })
  } catch {
    return NextResponse.json({ solutions: {}, languages: {} })
  }
}

// POST: upsert draft
export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const { solutions, languages } = await req.json()

  await prisma.codingDraft.upsert({
    where: { userId_moduleId: { userId: session!.userId, moduleId: params.moduleId } },
    create: {
      userId: session!.userId,
      moduleId: params.moduleId,
      solutions: JSON.stringify(solutions ?? {}),
      languages: JSON.stringify(languages ?? {}),
    },
    update: {
      solutions: JSON.stringify(solutions ?? {}),
      languages: JSON.stringify(languages ?? {}),
    },
  })

  return NextResponse.json({ ok: true })
}

// DELETE: clear draft after test submitted
export async function DELETE(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  await prisma.codingDraft.deleteMany({
    where: { userId: session!.userId, moduleId: params.moduleId },
  })

  return NextResponse.json({ ok: true })
}

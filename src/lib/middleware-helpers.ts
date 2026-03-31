import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from './auth'

export async function requireAuth(req: NextRequest): Promise<{
  session: Awaited<ReturnType<typeof getSessionFromRequest>>
  error: NextResponse | null
}> {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { session, error: null }
}

export async function requireAdmin(req: NextRequest): Promise<{
  session: Awaited<ReturnType<typeof getSessionFromRequest>>
  error: NextResponse | null
}> {
  const { session, error } = await requireAuth(req)
  if (error) return { session: null, error }
  if (session?.role !== 'ADMIN') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 }),
    }
  }
  return { session, error: null }
}

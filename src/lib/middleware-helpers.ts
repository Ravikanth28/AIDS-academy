import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from './auth'

type Session = NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>

type AuthSuccess = { session: Session; error: null }
type AuthFailure = { session: null; error: NextResponse }

export async function requireAuth(req: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { session, error: null }
}

export async function requireAdmin(req: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const result = await requireAuth(req)
  if (result.error) return result
  if (result.session.role !== 'ADMIN') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 }),
    }
  }
  return result
}

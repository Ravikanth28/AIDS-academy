import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { logActivity } from '@/lib/points'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (session?.userId) {
    logActivity(session.userId, 'LOGOUT', 'Signed out', 0).catch(() => {})
  }
  const response = NextResponse.json({ message: 'Logged out' })
  response.cookies.delete('auth_token')
  return response
}

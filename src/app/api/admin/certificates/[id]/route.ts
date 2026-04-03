import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { action, reason } = await req.json()

  if (action !== 'verify' && action !== 'revoke') {
    return NextResponse.json({ error: 'action must be "verify" or "revoke"' }, { status: 400 })
  }
  if (action === 'revoke' && !reason?.trim()) {
    return NextResponse.json({ error: 'Reason required when revoking' }, { status: 400 })
  }

  const cert = await prisma.certificate.findUnique({ where: { id: params.id } })
  if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })

  const updated = await prisma.certificate.update({
    where: { id: params.id },
    data:
      action === 'verify'
        ? { status: 'VERIFIED', revokedReason: null }
        : { status: 'REVOKED', revokedReason: reason.trim() },
  })

  return NextResponse.json(updated)
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware-helpers'

// GET current student profile
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: { id: true, name: true, phone: true, email: true, createdAt: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}

// PUT update student profile
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth(req)
  if (error) return error

  const { name, phone, email } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!phone?.trim() || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: 'Valid 10-digit phone number is required' }, { status: 400 })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  // Check if phone is taken by another user
  const existingPhone = await prisma.user.findUnique({ where: { phone } })
  if (existingPhone && existingPhone.id !== session!.userId) {
    return NextResponse.json({ error: 'Phone number already in use by another account' }, { status: 409 })
  }

  const updated = await prisma.user.update({
    where: { id: session!.userId },
    data: {
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
    },
    select: { id: true, name: true, phone: true, email: true },
  })

  return NextResponse.json(updated)
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// GET all students
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      enrollments: {
        include: {
          course: { select: { id: true, title: true } },
          moduleProgress: {
            include: { module: { select: { id: true, title: true, order: true } } },
          },
        },
      },
      certificates: {
        include: { course: { select: { id: true, title: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(students)
}

// POST register a new student (admin-created)
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { name, phone, email, password, role } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!phone?.trim() || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: 'Valid 10-digit phone number is required' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { phone } })
  if (existing) {
    return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 })
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  const data: Record<string, unknown> = {
    name: name.trim(),
    phone: phone.trim(),
    email: email?.trim() || null,
    role: role === 'ADMIN' ? 'ADMIN' : 'STUDENT',
  }

  if (password?.trim()) {
    data.password = hashPassword(password)
  }

  const user = await prisma.user.create({ data: data as any })

  return NextResponse.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
  }, { status: 201 })
}

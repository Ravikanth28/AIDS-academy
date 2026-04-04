import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'
import bcrypt from 'bcryptjs'

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// GET all students (paginated)
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        enrollments: {
          include: {
            course: { select: { id: true, title: true } },
            moduleProgress: {
              select: { testPassed: true },
            },
          },
        },
        certificates: {
          include: { course: { select: { id: true, title: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
  ])

  return NextResponse.json({ students, total, page, limit })
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

  const data: {
    name: string
    phone: string
    email: string | null
    role: 'ADMIN' | 'STUDENT'
    password?: string
  } = {
    name: name.trim(),
    phone: phone.trim(),
    email: email?.trim() ? email.trim().toLowerCase() : null,
    role: role === 'ADMIN' ? 'ADMIN' : 'STUDENT',
  }

  if (password?.trim()) {
    data.password = await hashPassword(password)
  }

  const user = await prisma.user.create({ data })

  return NextResponse.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
  }, { status: 201 })
}

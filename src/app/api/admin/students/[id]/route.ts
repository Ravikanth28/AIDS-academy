import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware-helpers'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const student = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      enrollments: {
        include: {
          course: {
            include: {
              modules: { orderBy: { order: 'asc' } },
            },
          },
          moduleProgress: {
            include: {
              module: { select: { id: true, title: true, order: true } },
            },
          },
        },
      },
      testAttempts: {
        include: {
          module: { select: { title: true, order: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      certificates: {
        include: { course: true },
      },
    },
  })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  return NextResponse.json(student)
}

// PUT update student details (name, phone, email, password)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { name, phone, email, password } = await req.json()

  const student = await prisma.user.findUnique({ where: { id: params.id } })
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {}

  if (name?.trim()) updateData.name = name.trim()
  if (phone?.trim()) {
    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }
    // Check if phone is taken by another user
    const existingPhone = await prisma.user.findUnique({ where: { phone } })
    if (existingPhone && existingPhone.id !== params.id) {
      return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 })
    }
    updateData.phone = phone.trim()
  }
  if (email !== undefined) {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    updateData.email = email?.trim() || null
  }
  if (password?.trim()) {
    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
    }
    updateData.password = hashPassword(password)
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, name: true, phone: true, email: true, role: true },
  })

  return NextResponse.json(updated)
}

// DELETE student
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const student = await prisma.user.findUnique({ where: { id: params.id } })
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ message: 'Student deleted successfully' })
}

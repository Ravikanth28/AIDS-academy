import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, action, name } = await req.json()

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 })
    }

    const otpSession = await prisma.oTPSession.findFirst({
      where: {
        phone,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpSession || otpSession.otp !== otp) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 })
    }

    // Mark OTP as used
    await prisma.oTPSession.update({
      where: { id: otpSession.id },
      data: { used: true },
    })

    let user
    if (action === 'register') {
      // Create the user
      user = await prisma.user.create({
        data: {
          name: name || phone,
          phone,
          role: 'STUDENT',
        },
      })
    } else {
      // Login - find existing user
      user = await prisma.user.findUnique({ where: { phone } })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
    }

    const token = await signToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
    })

    const response = NextResponse.json({
      message: action === 'register' ? 'Account created successfully' : 'Login successful',
      role: user.role,
      name: user.name,
    })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

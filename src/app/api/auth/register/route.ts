import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/utils'
import { sendOTP } from '@/lib/sms'

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, password } = await req.json()

    if (!name?.trim() || !phone?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Name, email, password, and phone are required' }, { status: 400 })
    }
    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if user already exists with that phone or email
    const existingPhone = await prisma.user.findUnique({ where: { phone } })
    if (existingPhone) {
      return NextResponse.json({ error: 'Phone number already registered. Please login.' }, { status: 409 })
    }
    const existingEmail = await prisma.user.findFirst({ where: { email: email.trim().toLowerCase() } })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered. Please login.' }, { status: 409 })
    }

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 mins

    // Clean up old OTPs for this phone
    await prisma.oTPSession.deleteMany({ where: { phone } })

    await prisma.oTPSession.create({
      data: { phone, otp, expiresAt },
    })

    // Send OTP via SMS
    const sent = await sendOTP(phone, otp)
    if (!sent) {
      return NextResponse.json({ error: 'Failed to send OTP. Check your phone number or try again.' }, { status: 500 })
    }

    const responseData: Record<string, string> = { message: 'OTP sent successfully' }
    // Only expose OTP in demo mode for development convenience
    if (process.env.DEMO_MODE === 'true') {
      responseData.demoOtp = otp
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

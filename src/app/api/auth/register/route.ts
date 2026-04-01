import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/utils'
import { sendOTP } from '@/lib/sms'

export async function POST(req: NextRequest) {
  try {
    const { name, phone } = await req.json()

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }
    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Check if user already exists with that number
    const existing = await prisma.user.findUnique({ where: { phone } })
    if (existing) {
      return NextResponse.json({ error: 'Phone number already registered. Please login.' }, { status: 409 })
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

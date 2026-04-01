import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/utils'
import { sendOTP } from '@/lib/sms'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user) {
      return NextResponse.json({ error: 'Phone number not registered. Please register first.' }, { status: 404 })
    }

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.oTPSession.deleteMany({ where: { phone } })
    await prisma.oTPSession.create({
      data: { phone, otp, expiresAt, userId: user.id },
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
    console.error('Login API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

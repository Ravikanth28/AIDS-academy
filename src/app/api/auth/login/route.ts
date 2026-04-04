import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/utils'
import { sendOTP } from '@/lib/sms'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const rl = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${rl.retryAfter} seconds.` },
        { status: 429 },
      )
    }

    const { phone } = await req.json()

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user) {
      return NextResponse.json({ error: 'Phone number not registered. Please register first.' }, { status: 404 })
    }

    const otp = generateOTP()
    const hashedOtp = await bcrypt.hash(otp, 10)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.oTPSession.deleteMany({ where: { phone } })
    await prisma.oTPSession.create({
      data: { phone, otp: hashedOtp, expiresAt, userId: user.id },
    })

    const responseData: Record<string, string> = { message: 'OTP sent successfully' }

    if (process.env.DEMO_MODE === 'true') {
      // Demo mode: skip SMS, show OTP directly on screen
      responseData.demoOtp = otp
    } else {
      const sent = await sendOTP(phone, otp)
      if (!sent) {
        return NextResponse.json({ error: 'Failed to send OTP. Check your phone number or try again.' }, { status: 500 })
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

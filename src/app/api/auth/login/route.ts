import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/utils'

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

    const responseData: Record<string, string> = { message: 'OTP sent successfully' }
    if (process.env.DEMO_MODE === 'true') {
      responseData.demoOtp = otp
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const ultraMsgInstanceId = process.env.ULTRAMSG_INSTANCE_ID
const ultraMsgToken = process.env.ULTRAMSG_TOKEN

export async function sendOTP(phone: string, otp: string): Promise<boolean> {
  // In demo mode, skip actual WhatsApp sending (for development only)
  if (process.env.DEMO_MODE === 'true') {
    console.log(`[DEMO] OTP for +91${phone}: ${otp}`)
    return true
  }

  if (!ultraMsgInstanceId || !ultraMsgToken) {
    console.error('UltraMsg credentials not configured. Set ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN in .env')
    return false
  }

  try {
    const normalizedPhone = phone.replace(/\D/g, '')
    const to = normalizedPhone.startsWith('91') ? `+${normalizedPhone}` : `+91${normalizedPhone}`
    const body = `Your AI·DS Academy verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`

    const response = await fetch(`https://api.ultramsg.com/${ultraMsgInstanceId}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: ultraMsgToken, to, body }),
    })

    const data = await response.json()
    console.log(`UltraMsg API response for ${to}:`, JSON.stringify(data))
    if (data?.error) {
      console.error(`UltraMsg WhatsApp error for +${to}:`, data.error)
      return false
    }

    console.log(`WhatsApp OTP sent to +${to}`)
    return true
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`UltraMsg WhatsApp error for +91${phone}:`, errMsg)
    return false
  }
}

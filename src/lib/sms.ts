import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromPhone = process.env.TWILIO_PHONE_NUMBER

let client: twilio.Twilio | null = null

function getClient() {
  if (!client) {
    if (!accountSid || !authToken || accountSid === 'your_twilio_account_sid') {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env')
    }
    client = twilio(accountSid, authToken)
  }
  return client
}

export async function sendOTP(phone: string, otp: string): Promise<boolean> {
  // In demo mode, skip actual SMS sending (for development only)
  if (process.env.DEMO_MODE === 'true') {
    console.log(`[DEMO] OTP for +91${phone}: ${otp}`)
    return true
  }

  if (!fromPhone || fromPhone === '+1234567890') {
    console.error('Twilio phone number not configured. Set TWILIO_PHONE_NUMBER in .env')
    return false
  }

  try {
    const twilioClient = getClient()
    const message = await twilioClient.messages.create({
      body: `Your AI·DS Academy verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      from: fromPhone,
      to: `+91${phone}`,
    })
    console.log(`SMS sent to +91${phone}, SID: ${message.sid}`)
    return true
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Twilio SMS error for +91${phone}:`, errMsg)
    return false
  }
}

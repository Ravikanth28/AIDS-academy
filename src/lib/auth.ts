import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Set it in your .env file before starting the server.')
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

export interface JWTPayload {
  userId: string
  phone: string
  role: 'ADMIN' | 'STUDENT'
  name: string
  email?: string | null
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getServerSession(): Promise<JWTPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getSessionFromRequest(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

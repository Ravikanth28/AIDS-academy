import { prisma } from './prisma'

export const POINTS = {
  LOGIN: 5,
  ENROLLED: 10,
  VIDEO_WATCHED: 10,
  TEST_PASSED: 25,
  CERTIFICATE_EARNED: 100,
}

export async function logActivity(
  userId: string,
  action: string,
  detail?: string,
  points: number = 0,
) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  await prisma.activityLog.create({
    data: { userId, action, detail: detail ?? null, points },
  })

  if (points > 0) {
    await prisma.monthlyPoints.upsert({
      where: { userId_month_year: { userId, month, year } },
      create: { userId, month, year, points },
      update: { points: { increment: points } },
    })
  }
}

/**
 * Award login points at most once per calendar day.
 * Always logs the LOGIN activity (for activity feed), but only adds
 * points if no LOGIN activity with points > 0 exists today.
 */
export async function logLoginActivity(userId: string) {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const todayLogin = await prisma.activityLog.findFirst({
    where: {
      userId,
      action: 'LOGIN',
      points: { gt: 0 },
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
  })

  const points = todayLogin ? 0 : POINTS.LOGIN
  await logActivity(userId, 'LOGIN', 'Login', points)
}

/**
 * One-time migration: deduplicate daily login points for all existing users.
 *
 * Problem: before the logLoginActivity() fix, every login awarded POINTS.LOGIN (5 pts).
 * Students who logged in multiple times on the same day accumulated duplicate points.
 *
 * This script:
 *  1. Finds all LOGIN activity entries with points > 0
 *  2. Groups them by userId + calendar date (IST/local server date)
 *  3. For each day that has more than one such entry, keeps the FIRST one and
 *     sets all subsequent entries' points to 0
 *  4. Subtracts the excess points from the corresponding MonthlyPoints record
 *
 * Run once with:
 *   npx tsx prisma/fix-login-points.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function datKey(d: Date) {
  // "YYYY-MM-DD" in local time — same as what logLoginActivity uses (midnight local)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function main() {
  console.log('🔍 Loading all LOGIN activity entries with points > 0…')

  const loginEntries = await prisma.activityLog.findMany({
    where: { action: 'LOGIN', points: { gt: 0 } },
    orderBy: { createdAt: 'asc' }, // oldest first — we keep the first per day
    select: { id: true, userId: true, points: true, createdAt: true },
  })

  console.log(`   Found ${loginEntries.length} paid LOGIN entries across all users.`)

  // Group by userId + date
  const seen = new Map<string, boolean>() // key: userId|dateStr => already seen
  const toZero: { id: string; userId: string; points: number; createdAt: Date }[] = []

  for (const entry of loginEntries) {
    const key = `${entry.userId}|${datKey(entry.createdAt)}`
    if (seen.has(key)) {
      // Duplicate for this day — mark for zeroing
      toZero.push(entry)
    } else {
      seen.set(key, true)
    }
  }

  if (toZero.length === 0) {
    console.log('✅ No duplicate login points found. Database is clean.')
    return
  }

  console.log(`\n⚠️  Found ${toZero.length} duplicate login point entries to fix.`)

  // Group excess points to deduct per userId+month+year so we can batch the subtraction
  const deductions = new Map<string, number>() // key: userId|month|year => pts to deduct
  for (const entry of toZero) {
    const d = entry.createdAt
    const key = `${entry.userId}|${d.getMonth() + 1}|${d.getFullYear()}`
    deductions.set(key, (deductions.get(key) ?? 0) + entry.points)
  }

  console.log('\n📝 Zero-ing out duplicate LOGIN activity entries…')
  let zeroed = 0
  for (const entry of toZero) {
    await prisma.activityLog.update({
      where: { id: entry.id },
      data: { points: 0 },
    })
    zeroed++
    if (zeroed % 50 === 0) process.stdout.write(`   ${zeroed}/${toZero.length}\r`)
  }
  console.log(`   ✅ Zeroed ${zeroed} entries.`)

  console.log('\n📊 Adjusting MonthlyPoints records…')
  let adjusted = 0
  for (const [key, excess] of deductions) {
    const [userId, monthStr, yearStr] = key.split('|')
    const month = parseInt(monthStr)
    const year = parseInt(yearStr)

    const record = await prisma.monthlyPoints.findUnique({
      where: { userId_month_year: { userId, month, year } },
    })

    if (!record) continue // nothing to adjust

    const newPoints = Math.max(0, record.points - excess)
    await prisma.monthlyPoints.update({
      where: { userId_month_year: { userId, month, year } },
      data: { points: newPoints },
    })
    adjusted++
    console.log(`   User ${userId}  ${year}-${String(month).padStart(2,'0')}  -${excess} pts  (${record.points} → ${newPoints})`)
  }

  console.log(`\n✅ Done. Adjusted ${adjusted} MonthlyPoints record(s).`)
  console.log(`   Total excess points removed: ${[...deductions.values()].reduce((a, b) => a + b, 0)}`)
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())

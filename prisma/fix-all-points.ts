/**
 * Comprehensive points fix — run after fix-login-points.ts (or standalone).
 *
 * Fixes duplicate activityLog points for TEST_PASSED and CERTIFICATE_EARNED,
 * then recomputes every user's monthlyPoints as the authoritative sum of their
 * corrected activityLog entries.
 *
 * Rules enforced:
 *  - TEST_PASSED (25 pts)      : awarded only ONCE per unique (userId, moduleId),
 *                                the first time they ever passed that module.
 *  - CERTIFICATE_EARNED (100 pts): awarded only ONCE per unique (userId, courseId).
 *  - LOGIN (5 pts)             : already fixed by fix-login-points.ts (once per day).
 *  - ENROLLED (10 pts)         : already one-per-course by DB constraint — no fix needed.
 *
 * After fixing activityLog, monthlyPoints is rebuilt as the exact sum of
 * activityLog.points per (userId, month, year) so all records are consistent.
 *
 * Run with:
 *   npx tsx prisma/fix-all-points.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function monthYear(d: Date) {
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log(' Comprehensive Points Fix')
  console.log('═══════════════════════════════════════════════════\n')

  /* ─────────────────────────────────────────────────────────
     STEP 1 — Fix TEST_PASSED duplicates
     A student earns 25 pts the FIRST time they pass each module.
     Any subsequent passing of the same module = 0 pts.
  ───────────────────────────────────────────────────────── */
  console.log('📋 STEP 1 — Fixing TEST_PASSED duplicates…')

  // Find the first passing attempt for every (userId, moduleId) pair
  const allPassingAttempts = await prisma.testAttempt.findMany({
    where: { passed: true },
    orderBy: { createdAt: 'asc' },
    select: { userId: true, moduleId: true, createdAt: true },
  })

  // Build a map: "userId|moduleId" -> Date of first pass
  const firstPassMap = new Map<string, Date>()
  for (const a of allPassingAttempts) {
    const k = `${a.userId}|${a.moduleId}`
    if (!firstPassMap.has(k)) firstPassMap.set(k, a.createdAt)
  }

  // For each user, count how many unique modules were first-passed per (month, year)
  // keyed as "userId|month|year" -> legitimate count
  const testLegitimate = new Map<string, number>()
  for (const [, date] of firstPassMap) {
    // We need userId from the key — rebuild
  }
  // Rebuild properly
  const testLegitimateByUser = new Map<string, Map<string, number>>() // userId -> "month|year" -> count
  for (const [key, date] of firstPassMap) {
    const userId = key.split('|')[0]
    const { month, year } = monthYear(date)
    const monthKey = `${month}|${year}`
    if (!testLegitimateByUser.has(userId)) testLegitimateByUser.set(userId, new Map())
    const inner = testLegitimateByUser.get(userId)!
    inner.set(monthKey, (inner.get(monthKey) ?? 0) + 1)
  }

  // Get all TEST_PASSED paid activityLog entries, sorted oldest-first
  const testEntries = await prisma.activityLog.findMany({
    where: { action: 'TEST_PASSED', points: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true, points: true, createdAt: true },
  })

  console.log(`   Found ${testEntries.length} paid TEST_PASSED entries.`)

  // For each user per month, keep the first N (legitimate) and zero the rest
  const testSeenCount = new Map<string, number>() // "userId|month|year" -> how many we've kept
  const testToZero: typeof testEntries = []

  for (const entry of testEntries) {
    const { month, year } = monthYear(entry.createdAt)
    const key = `${entry.userId}|${month}|${year}`
    const legitimate = testLegitimateByUser.get(entry.userId)?.get(`${month}|${year}`) ?? 0
    const kept = testSeenCount.get(key) ?? 0

    if (kept < legitimate) {
      testSeenCount.set(key, kept + 1)
    } else {
      testToZero.push(entry)
    }
  }

  console.log(`   → ${testToZero.length} duplicate TEST_PASSED entries to zero out.`)
  for (const entry of testToZero) {
    await prisma.activityLog.update({ where: { id: entry.id }, data: { points: 0 } })
  }
  console.log(`   ✅ TEST_PASSED fixed.\n`)

  /* ─────────────────────────────────────────────────────────
     STEP 2 — Fix CERTIFICATE_EARNED duplicates
     A student earns 100 pts once per course certificate.
  ───────────────────────────────────────────────────────── */
  console.log('🏆 STEP 2 — Fixing CERTIFICATE_EARNED duplicates…')

  // Find all certificates: one per (userId, courseId), use issuedAt as earn date
  const certificates = await prisma.certificate.findMany({
    select: { userId: true, courseId: true, issuedAt: true },
  })

  // Build legitimate count per (userId, month, year) for CERTIFICATE_EARNED
  const certLegitByUser = new Map<string, Map<string, number>>() // userId -> "month|year" -> count
  for (const cert of certificates) {
    const { month, year } = monthYear(cert.issuedAt)
    const monthKey = `${month}|${year}`
    if (!certLegitByUser.has(cert.userId)) certLegitByUser.set(cert.userId, new Map())
    const inner = certLegitByUser.get(cert.userId)!
    inner.set(monthKey, (inner.get(monthKey) ?? 0) + 1)
  }

  const certEntries = await prisma.activityLog.findMany({
    where: { action: 'CERTIFICATE_EARNED', points: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true, points: true, createdAt: true },
  })

  console.log(`   Found ${certEntries.length} paid CERTIFICATE_EARNED entries.`)

  const certSeenCount = new Map<string, number>()
  const certToZero: typeof certEntries = []

  for (const entry of certEntries) {
    const { month, year } = monthYear(entry.createdAt)
    const key = `${entry.userId}|${month}|${year}`
    const legitimate = certLegitByUser.get(entry.userId)?.get(`${month}|${year}`) ?? 0
    const kept = certSeenCount.get(key) ?? 0

    if (kept < legitimate) {
      certSeenCount.set(key, kept + 1)
    } else {
      certToZero.push(entry)
    }
  }

  console.log(`   → ${certToZero.length} duplicate CERTIFICATE_EARNED entries to zero out.`)
  for (const entry of certToZero) {
    await prisma.activityLog.update({ where: { id: entry.id }, data: { points: 0 } })
  }
  console.log(`   ✅ CERTIFICATE_EARNED fixed.\n`)

  /* ─────────────────────────────────────────────────────────
     STEP 3 — Recompute all monthlyPoints from corrected activityLog
     Sum activityLog.points per (userId, month, year) and overwrite.
  ───────────────────────────────────────────────────────── */
  console.log('📊 STEP 3 — Recomputing all monthlyPoints from corrected activityLog…')

  // Aggregate points per user per month/year
  const allActivity = await prisma.activityLog.findMany({
    where: { points: { gt: 0 } },
    select: { userId: true, points: true, createdAt: true },
  })

  // Accumulate
  const computed = new Map<string, { userId: string; month: number; year: number; points: number }>()
  for (const row of allActivity) {
    const { month, year } = monthYear(row.createdAt)
    const key = `${row.userId}|${month}|${year}`
    if (!computed.has(key)) {
      computed.set(key, { userId: row.userId, month, year, points: 0 })
    }
    computed.get(key)!.points += row.points
  }

  // Fetch all existing monthlyPoints records
  const existingRecords = await prisma.monthlyPoints.findMany({
    select: { id: true, userId: true, month: true, year: true, points: true },
  })

  const existingMap = new Map<string, { id: string; points: number }>()
  for (const r of existingRecords) {
    existingMap.set(`${r.userId}|${r.month}|${r.year}`, { id: r.id, points: r.points })
  }

  let updated = 0; let created = 0; let unchanged = 0

  for (const [key, entry] of computed) {
    const existing = existingMap.get(key)
    if (existing) {
      if (existing.points !== entry.points) {
        console.log(`   ${entry.userId.slice(-8)}  ${entry.year}-${String(entry.month).padStart(2,'0')}  ${existing.points} → ${entry.points} pts`)
        await prisma.monthlyPoints.update({
          where: { id: existing.id },
          data: { points: entry.points },
        })
        updated++
      } else {
        unchanged++
      }
    } else {
      // Create missing record
      await prisma.monthlyPoints.create({
        data: { userId: entry.userId, month: entry.month, year: entry.year, points: entry.points },
      })
      created++
    }
  }

  // Zero out any monthlyPoints records for users/months with no activity
  for (const [key, existing] of existingMap) {
    if (!computed.has(key) && existing.points > 0) {
      const [userId, monthStr, yearStr] = key.split('|')
      console.log(`   ${userId.slice(-8)}  clearing orphaned record — was ${existing.points} pts`)
      await prisma.monthlyPoints.update({
        where: { id: existing.id },
        data: { points: 0 },
      })
      updated++
    }
  }

  console.log(`\n   ✅ monthlyPoints recomputed: ${updated} updated, ${created} created, ${unchanged} already correct.\n`)

  /* ─────────────────────────────────────────────────────────
     Summary
  ───────────────────────────────────────────────────────── */
  const totalRemoved =
    testToZero.reduce((s, e) => s + e.points, 0) +
    certToZero.reduce((s, e) => s + e.points, 0)

  console.log('═══════════════════════════════════════════════════')
  console.log(` Done.`)
  console.log(`   TEST_PASSED  duplicates zeroed : ${testToZero.length} entries  (−${testToZero.reduce((s, e) => s + e.points, 0)} pts)`)
  console.log(`   CERT_EARNED  duplicates zeroed : ${certToZero.length} entries  (−${certToZero.reduce((s, e) => s + e.points, 0)} pts)`)
  console.log(`   Total excess points removed    : ${totalRemoved}`)
  console.log('═══════════════════════════════════════════════════')
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())

/**
 * Retroactively create certificates for students who have completed all modules
 * (testPassed = true for all modules in the course) but have no certificate yet.
 *
 * This fixes the race-condition bug where allProgress was fetched in parallel
 * with the module progress update, causing allPassed to never be true.
 *
 * Run with:
 *   npx tsx prisma/fix-missing-certificates.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log(' Fix Missing Certificates')
  console.log('═══════════════════════════════════════════════════\n')

  // Fetch all enrollments with their course modules and student progress
  const enrollments = await prisma.enrollment.findMany({
    include: {
      course: {
        include: {
          modules: { select: { id: true, order: true } },
        },
      },
      moduleProgress: true,
    },
  })

  console.log(`Found ${enrollments.length} total enrollments\n`)

  let fixed = 0
  let alreadyHad = 0
  let incomplete = 0

  for (const enrollment of enrollments) {
    const modules = enrollment.course.modules
    if (modules.length === 0) continue

    // Check if all modules have testPassed = true
    const allPassed = modules.every((m) =>
      enrollment.moduleProgress.some((p) => p.moduleId === m.id && p.testPassed),
    )

    if (!allPassed) {
      incomplete++
      continue
    }

    // Check if certificate already exists
    const existingCert = await prisma.certificate.findUnique({
      where: { userId_courseId: { userId: enrollment.userId, courseId: enrollment.courseId } },
    })

    if (existingCert) {
      alreadyHad++
      continue
    }

    // Create the certificate
    const certCount = await prisma.certificate.count()
    const year = new Date().getFullYear()
    const certificateNo = `CERT-${year}-${String(certCount + 1).padStart(5, '0')}`

    await prisma.certificate.create({
      data: {
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        certificateNo,
        status: 'PENDING',
      },
    })

    // Also fix any moduleProgress rows where videoCompleted is still false
    const incompleteVideos = enrollment.moduleProgress.filter((p) => p.testPassed && !p.videoCompleted)
    if (incompleteVideos.length > 0) {
      await prisma.moduleProgress.updateMany({
        where: {
          enrollmentId: enrollment.id,
          testPassed: true,
          videoCompleted: false,
        },
        data: { videoCompleted: true },
      })
      console.log(`  ↳ Fixed ${incompleteVideos.length} moduleProgress row(s) with videoCompleted=false`)
    }

    const user = await prisma.user.findUnique({ where: { id: enrollment.userId }, select: { name: true } })
    console.log(`✅ Created certificate ${certificateNo} for user "${user?.name}" on course "${enrollment.course.title}"`)
    fixed++
  }

  console.log('\n═══════════════════════════════════════════════════')
  console.log(` Results:`)
  console.log(`   Certificates created : ${fixed}`)
  console.log(`   Already had cert     : ${alreadyHad}`)
  console.log(`   Incomplete (skipped) : ${incomplete}`)
  console.log('═══════════════════════════════════════════════════\n')
}

main()
  .catch((e) => { console.error(e); throw e })
  .finally(() => prisma.$disconnect())

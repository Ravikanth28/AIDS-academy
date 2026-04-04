import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Get all courses with their modules
  const courses = await prisma.course.findMany({
    include: { modules: { select: { id: true, title: true, order: true }, orderBy: { order: 'asc' } } },
  })

  console.log('=== CERT STATUS SUMMARY ===')
  const certs = await prisma.certificate.findMany()
  const pending = certs.filter(c => c.status === 'PENDING')
  const verified = certs.filter(c => c.status === 'VERIFIED')
  console.log(`Total: ${certs.length}, Verified: ${verified.length}, Pending: ${pending.length}`)
  console.log('PENDING certs:', pending.map(c => c.certificateNo))

  console.log('\n=== CHECKING FOR MISSING CERTS ===')
  // Get enrollments with progress and cert info
  const enrollments = await prisma.enrollment.findMany({
    include: {
      user: { select: { name: true } },
      course: true,
      moduleProgress: { select: { moduleId: true, testPassed: true, videoCompleted: true } },
    },
  })

  const certsByUser = await prisma.certificate.findMany({
    select: { userId: true, courseId: true, certificateNo: true, status: true },
  })
  const certMap = new Set(certsByUser.map(c => `${c.userId}:${c.courseId}`))

  let missingCount = 0
  for (const e of enrollments) {
    const course = courses.find(c => c.id === e.courseId)
    if (!course) continue
    const allModules = course.modules

    const allPassed = allModules.every(m =>
      e.moduleProgress.some(p => p.moduleId === m.id && p.testPassed)
    )
    const hasCert = certMap.has(`${e.userId}:${e.courseId}`)

    if (allPassed && !hasCert) {
      missingCount++
      console.log(`MISSING: user="${e.user.name}", course="${e.courseId}"`)
    }
  }
  if (missingCount === 0) console.log('No missing certs found!')

  console.log('\n=== RECENT CERTS (last 5) ===')
  const recent = await prisma.certificate.findMany({
    orderBy: { issuedAt: 'desc' },
    take: 5,
    include: { user: { select: { name: true } }, course: { select: { title: true } } },
  })
  console.log(recent.map(c => ({ certNo: c.certificateNo, status: c.status, user: c.user.name, issuedAt: c.issuedAt })))
}

main()
  .then(() => { /* done */ })
  .catch(e => { console.error(e); throw e })

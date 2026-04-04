import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const certs = await prisma.certificate.findMany({
    include: {
      user: { select: { name: true, phone: true } },
      course: { select: { title: true } },
    },
  })
  console.log('=== ALL CERTIFICATES ===')
  console.log(JSON.stringify(certs.map(c => ({ certNo: c.certificateNo, status: c.status, user: c.user.name, course: c.course.title })), null, 2))

  // Find enrollments where all module tests passed but no cert
  const enrollments = await prisma.enrollment.findMany({
    include: {
      course: { include: { modules: { select: { id: true, title: true, order: true } } } },
      moduleProgress: true,
      certificate: true,
      user: { select: { name: true } },
    },
  })

  console.log('\n=== ENROLLMENTS MISSING CERTS ===')
  for (const e of enrollments) {
    const allModules = e.course.modules
    const allPassed = allModules.every(m => e.moduleProgress.some(p => p.moduleId === m.id && p.testPassed && p.videoCompleted))
    const allPassedNoVideo = allModules.every(m => e.moduleProgress.some(p => p.moduleId === m.id && p.testPassed))
    if (allPassedNoVideo && !e.certificate) {
      console.log(`MISSING: user=${e.user.name}, course=${e.course.title}, allPassed=${allPassed}, allPassedNoVideo=${allPassedNoVideo}`)
      console.log('  modules:', allModules.map(m => m.title))
      console.log('  progress:', e.moduleProgress.map(p => ({ testPassed: p.testPassed, videoCompleted: p.videoCompleted, moduleId: p.moduleId })))
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1) })

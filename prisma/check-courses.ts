import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const courses = await prisma.course.findMany({
    where: { id: { in: ['cmnihkccw0004uxq465zxw2up', 'cmnisjx0i000214ogb17qxy7l'] } },
    select: { id: true, title: true },
  })
  console.log('Courses with missing certs:', courses)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })

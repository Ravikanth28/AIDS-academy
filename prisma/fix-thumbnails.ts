/**
 * fix-thumbnails.ts
 * Reads course thumbnails from Neon and updates them in TiDB.
 * Run with: npx tsx prisma/fix-thumbnails.ts
 */
import { Client } from 'pg'
import { PrismaClient } from '@prisma/client'

const NEON_URL =
  'postgresql://neondb_owner:npg_bCikJx6Af1IY@ep-autumn-darkness-an1tk3vu-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require'

const tidb = new PrismaClient()

async function main() {
  const pg = new Client({ connectionString: NEON_URL })
  await pg.connect()
  console.log('✅ Connected to Neon')

  const { rows } = await pg.query('SELECT id, thumbnail FROM "Course" WHERE thumbnail IS NOT NULL')
  console.log(`Found ${rows.length} courses with thumbnails`)

  for (const row of rows) {
    await tidb.course.update({
      where: { id: row.id },
      data: { thumbnail: row.thumbnail },
    })
    console.log(`✅ Updated thumbnail for course: ${row.id} (${row.thumbnail?.length} chars)`)
  }

  await pg.end()
  await tidb.$disconnect()
  console.log('\n🎉 Thumbnails fixed!')
}

main().catch(e => { console.error(e); process.exit(1) })

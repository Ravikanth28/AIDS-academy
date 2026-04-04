/**
 * migrate-from-neon.ts
 * Copies ALL data from the old Neon PostgreSQL database into the new TiDB (MySQL) database.
 * Run once with:  npx tsx prisma/migrate-from-neon.ts
 */

import { Client } from 'pg'
import { PrismaClient } from '@prisma/client'

const NEON_URL =
  'postgresql://neondb_owner:npg_bCikJx6Af1IY@ep-autumn-darkness-an1tk3vu-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require'

// Plain Prisma client (no $extends) so videosWatched is treated as plain string
const tidb = new PrismaClient()

async function migrate() {
  const pg = new Client({ connectionString: NEON_URL })
  await pg.connect()
  console.log('\n✅ Connected to Neon PostgreSQL\n')

  try {
    // ── 1. Users ──────────────────────────────────────────────────────────────
    const { rows: users } = await pg.query('SELECT * FROM "User"')
    if (users.length > 0) {
      await tidb.user.createMany({
        data: users.map((u: any) => ({
          id: u.id,
          name: u.name,
          phone: u.phone,
          email: u.email ?? null,
          password: u.password ?? null,
          role: u.role,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ Users migrated:           ${users.length}`)
    }

    // ── 2. Courses ────────────────────────────────────────────────────────────
    const { rows: courses } = await pg.query('SELECT * FROM "Course"')
    if (courses.length > 0) {
      await tidb.course.createMany({
        data: courses.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          thumbnail: c.thumbnail ?? null,
          category: c.category ?? 'AI & Data Science',
          isPublished: c.isPublished,
          isAssignedOnly: c.isAssignedOnly ?? false,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ Courses migrated:         ${courses.length}`)
    }

    // ── 3. Modules ────────────────────────────────────────────────────────────
    const { rows: modules } = await pg.query('SELECT * FROM "Module"')
    if (modules.length > 0) {
      await tidb.module.createMany({
        data: modules.map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description ?? null,
          order: m.order,
          courseId: m.courseId,
          passingScore: m.passingScore ?? 60,
          questionCount: m.questionCount ?? 10,
          createdAt: new Date(m.createdAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ Modules migrated:         ${modules.length}`)
    }

    // ── 4. Videos ─────────────────────────────────────────────────────────────
    const { rows: videos } = await pg.query('SELECT * FROM "Video"')
    if (videos.length > 0) {
      await tidb.video.createMany({
        data: videos.map((v: any) => ({
          id: v.id,
          title: v.title,
          youtubeUrl: v.youtubeUrl,
          description: v.description ?? null,
          order: v.order ?? 0,
          moduleId: v.moduleId,
          createdAt: new Date(v.createdAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ Videos migrated:          ${videos.length}`)
    }

    // ── 5. Questions ──────────────────────────────────────────────────────────
    const { rows: questions } = await pg.query('SELECT * FROM "Question"')
    if (questions.length > 0) {
      await tidb.question.createMany({
        data: questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          moduleId: q.moduleId,
          explanation: q.explanation ?? null,
          videoId: q.videoId ?? null,
          timestamp: q.timestamp ?? null,
          createdAt: new Date(q.createdAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ Questions migrated:       ${questions.length}`)
    }

    // ── 6. QuestionOptions ────────────────────────────────────────────────────
    const { rows: options } = await pg.query('SELECT * FROM "QuestionOption"')
    if (options.length > 0) {
      await tidb.questionOption.createMany({
        data: options.map((o: any) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          order: o.order ?? 0,
          questionId: o.questionId,
        })),
        skipDuplicates: true,
      })
      console.log(`✅ QuestionOptions migrated: ${options.length}`)
    }

    // ── 7. CodingQuestions ────────────────────────────────────────────────────
    const { rows: codingQs } = await pg.query('SELECT * FROM "CodingQuestion"')
    if (codingQs.length > 0) {
      await tidb.codingQuestion.createMany({
        data: codingQs.map((cq: any) => ({
          id: cq.id,
          moduleId: cq.moduleId,
          type: cq.type ?? 'coding',
          difficulty: cq.difficulty ?? 'medium',
          mode: cq.mode ?? 'both',
          title: cq.title,
          description: cq.description,
          examples: Array.isArray(cq.examples)
            ? JSON.stringify(cq.examples)
            : (cq.examples ?? '[]'),
          constraints: cq.constraints ?? null,
          starterCode: Array.isArray(cq.starterCode)
            ? JSON.stringify(cq.starterCode)
            : (cq.starterCode ?? ''),
          hints: Array.isArray(cq.hints)
            ? JSON.stringify(cq.hints)
            : (cq.hints ?? '[]'),
          sampleSolution: cq.sampleSolution ?? '',
          order: cq.order ?? 0,
          createdAt: new Date(cq.createdAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ CodingQuestions migrated: ${codingQs.length}`)
    }

    // ── 8. CourseAssignments ──────────────────────────────────────────────────
    const { rows: assignments } = await pg.query('SELECT * FROM "CourseAssignment"')
    if (assignments.length > 0) {
      await tidb.courseAssignment.createMany({
        data: assignments.map((a: any) => ({
          id: a.id,
          courseId: a.courseId,
          userId: a.userId,
          createdAt: new Date(a.createdAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ CourseAssignments migrated: ${assignments.length}`)
    }

    // ── 9. Enrollments ────────────────────────────────────────────────────────
    const { rows: enrollments } = await pg.query('SELECT * FROM "Enrollment"')
    if (enrollments.length > 0) {
      await tidb.enrollment.createMany({
        data: enrollments.map((e: any) => ({
          id: e.id,
          userId: e.userId,
          courseId: e.courseId,
          enrolledAt: new Date(e.enrolledAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ Enrollments migrated:     ${enrollments.length}`)
    }

    // ── 10. ModuleProgress ────────────────────────────────────────────────────
    const { rows: progress } = await pg.query('SELECT * FROM "ModuleProgress"')
    if (progress.length > 0) {
      // videosWatched in Neon was String[] (PostgreSQL array) → JSON.stringify for MySQL
      await tidb.moduleProgress.createMany({
        data: progress.map((p: any) => ({
          id: p.id,
          enrollmentId: p.enrollmentId,
          moduleId: p.moduleId,
          videosWatched: Array.isArray(p.videosWatched)
            ? JSON.stringify(p.videosWatched)
            : (p.videosWatched ?? '[]'),
          videoCompleted: p.videoCompleted,
          testPassed: p.testPassed,
          testScore: p.testScore ?? null,
          completedAt: p.completedAt ? new Date(p.completedAt) : null,
        })),
        skipDuplicates: true,
      })
      console.log(`✅ ModuleProgress migrated:  ${progress.length}`)
    }

    // ── 11. TestAttempts ──────────────────────────────────────────────────────
    const { rows: attempts } = await pg.query('SELECT * FROM "TestAttempt"')
    if (attempts.length > 0) {
      await tidb.testAttempt.createMany({
        data: attempts.map((a: any) => ({
          id: a.id,
          userId: a.userId,
          moduleId: a.moduleId,
          score: a.score,
          totalQuestions: a.totalQuestions,
          correctAnswers: a.correctAnswers,
          passed: a.passed,
          createdAt: new Date(a.createdAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ TestAttempts migrated:    ${attempts.length}`)
    }

    // ── 12. TestAnswers ───────────────────────────────────────────────────────
    const { rows: answers } = await pg.query('SELECT * FROM "TestAnswer"')
    if (answers.length > 0) {
      await tidb.testAnswer.createMany({
        data: answers.map((a: any) => ({
          id: a.id,
          testAttemptId: a.testAttemptId,
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId ?? null,
          isCorrect: a.isCorrect,
        })),
        skipDuplicates: true,
      })
      console.log(`✅ TestAnswers migrated:     ${answers.length}`)
    }

    // ── 13. Certificates ──────────────────────────────────────────────────────
    const { rows: certs } = await pg.query('SELECT * FROM "Certificate"')
    if (certs.length > 0) {
      await tidb.certificate.createMany({
        data: certs.map((c: any) => ({
          id: c.id,
          userId: c.userId,
          courseId: c.courseId,
          certificateNo: c.certificateNo,
          status: c.status,
          revokedReason: c.revokedReason ?? null,
          issuedAt: new Date(c.issuedAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ Certificates migrated:    ${certs.length}`)
    }

    // ── 14. PracticeAttempts ──────────────────────────────────────────────────
    const { rows: practiceAttempts } = await pg.query('SELECT * FROM "PracticeAttempt"')
    if (practiceAttempts.length > 0) {
      await tidb.practiceAttempt.createMany({
        data: practiceAttempts.map((p: any) => ({
          id: p.id,
          userId: p.userId,
          moduleId: p.moduleId,
          mcqScore: p.mcqScore ?? 0,
          totalMcq: p.totalMcq ?? 0,
          correctMcq: p.correctMcq ?? 0,
          exercisesCompleted: p.exercisesCompleted ?? 0,
          totalExercises: p.totalExercises ?? 0,
          overallScore: p.overallScore ?? 0,
          completedAt: new Date(p.completedAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ PracticeAttempts migrated:${practiceAttempts.length}`)
    }

    // ── 15. CodingAttempts ────────────────────────────────────────────────────
    const { rows: codingAttempts } = await pg.query('SELECT * FROM "CodingAttempt"')
    if (codingAttempts.length > 0) {
      await tidb.codingAttempt.createMany({
        data: codingAttempts.map((c: any) => ({
          id: c.id,
          userId: c.userId,
          moduleId: c.moduleId,
          score: c.score ?? 0,
          totalProblems: c.totalProblems ?? 0,
          passed: c.passed ?? false,
          feedback: c.feedback ?? null,
          completedAt: new Date(c.completedAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ CodingAttempts migrated:  ${codingAttempts.length}`)
    }

    // ── 16. CodingDrafts ──────────────────────────────────────────────────────
    const { rows: drafts } = await pg.query('SELECT * FROM "CodingDraft"')
    if (drafts.length > 0) {
      await tidb.codingDraft.createMany({
        data: drafts.map((d: any) => ({
          id: d.id,
          userId: d.userId,
          moduleId: d.moduleId,
          solutions: d.solutions,
          languages: d.languages ?? '{}',
          updatedAt: new Date(d.updatedAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ CodingDrafts migrated:    ${drafts.length}`)
    }

    // ── 17. ActivityLogs ──────────────────────────────────────────────────────
    const { rows: logs } = await pg.query('SELECT * FROM "ActivityLog"')
    if (logs.length > 0) {
      // Insert in batches of 500 to avoid oversized queries
      const BATCH = 500
      for (let i = 0; i < logs.length; i += BATCH) {
        const chunk = logs.slice(i, i + BATCH)
        await tidb.activityLog.createMany({
          data: chunk.map((l: any) => ({
            id: l.id,
            userId: l.userId,
            action: l.action,
            detail: l.detail ?? null,
            points: l.points ?? 0,
            createdAt: new Date(l.createdAt),
          })),
          skipDuplicates: true,
        })
      }
      console.log(`✅ ActivityLogs migrated:    ${logs.length}`)
    }

    // ── 18. MonthlyPoints ─────────────────────────────────────────────────────
    const { rows: monthly } = await pg.query('SELECT * FROM "MonthlyPoints"')
    if (monthly.length > 0) {
      await tidb.monthlyPoints.createMany({
        data: monthly.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          month: m.month,
          year: m.year,
          points: m.points ?? 0,
          rank: m.rank ?? null,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        })),
        skipDuplicates: true,
      })
      console.log(`✅ MonthlyPoints migrated:   ${monthly.length}`)
    }

    // ── 19. OTPSessions (skip — transient/expired data, not needed) ───────────
    console.log(`⏭️  OTPSessions skipped       (transient data, not needed)`)

    console.log('\n🎉 Migration complete! All data is now in TiDB.\n')
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message)
    console.error(err)
    process.exit(1)
  } finally {
    await pg.end()
    await tidb.$disconnect()
  }
}

migrate()

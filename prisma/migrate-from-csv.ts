/**
 * migrate-from-csv.ts
 * Imports all data from the exported TiDB CSV files into the new TiDB database.
 * Run with:  npx tsx prisma/migrate-from-csv.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import Papa from 'papaparse'

const prisma = new PrismaClient()

const CSV_DIR = path.join(__dirname, '..', 'TiDb data')

function readCsv(filename: string): any[] {
  const filePath = path.join(CSV_DIR, filename)
  const content = fs.readFileSync(filePath, 'utf-8')
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // keep everything as string for manual conversion
  })
  if (result.errors.length > 0) {
    console.warn(`⚠️  Parse warnings for ${filename}:`, result.errors.slice(0, 3))
  }
  return result.data as any[]
}

/** Return null if the value is an empty string, otherwise return value */
function n(v: string | undefined | null): string | null {
  return v === '' || v == null ? null : v
}

/** Convert '0'/'1' (or 'true'/'false') to boolean */
function b(v: string | undefined | null): boolean {
  return v === '1' || v === 'true'
}

/** Parse date string to Date, return null if empty */
function d(v: string | undefined | null): Date | null {
  if (!v || v === '') return null
  return new Date(v)
}

/** Parse date string to Date, fallback to now if empty */
function dRequired(v: string | undefined | null): Date {
  if (!v || v === '') return new Date()
  return new Date(v)
}

/** Parse integer, fallback to defaultVal */
function i(v: string | undefined | null, defaultVal = 0): number {
  const parsed = parseInt(v ?? '', 10)
  return isNaN(parsed) ? defaultVal : parsed
}

/** Parse float, fallback to defaultVal */
function f(v: string | undefined | null, defaultVal = 0): number {
  const parsed = parseFloat(v ?? '')
  return isNaN(parsed) ? defaultVal : parsed
}

async function main() {
  console.log('\n🚀 Starting CSV → TiDB migration\n')

  // ── 1. Users ──────────────────────────────────────────────────────────────
  const users = readCsv('user.csv')
  if (users.length > 0) {
    await prisma.user.createMany({
      data: users.map((u: any) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: n(u.email),
        password: n(u.password),
        role: u.role as 'ADMIN' | 'STUDENT',
        createdAt: dRequired(u.createdAt),
        updatedAt: dRequired(u.updatedAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Users:              ${users.length}`)
  }

  // ── 2. Courses ────────────────────────────────────────────────────────────
  const courses = readCsv('course.csv')
  if (courses.length > 0) {
    await prisma.course.createMany({
      data: courses.map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnail: n(c.thumbnail),
        category: n(c.category) ?? 'AI & Data Science',
        isPublished: b(c.isPublished),
        isAssignedOnly: b(c.isAssignedOnly),
        allowVideoControls: b(c.allowVideoControls),
        createdAt: dRequired(c.createdAt),
        updatedAt: dRequired(c.updatedAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Courses:            ${courses.length}`)
  }

  // ── 3. OTP Sessions ───────────────────────────────────────────────────────
  const otpSessions = readCsv('otpSession.csv')
  if (otpSessions.length > 0) {
    await prisma.oTPSession.createMany({
      data: otpSessions.map((o: any) => ({
        id: o.id,
        phone: o.phone,
        otp: o.otp,
        expiresAt: dRequired(o.expiresAt),
        used: b(o.used),
        userId: n(o.userId),
        createdAt: dRequired(o.createdAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ OTP Sessions:       ${otpSessions.length}`)
  }

  // ── 4. Modules ────────────────────────────────────────────────────────────
  const modules = readCsv('module.csv')
  if (modules.length > 0) {
    await prisma.module.createMany({
      data: modules.map((m: any) => ({
        id: m.id,
        title: m.title,
        description: n(m.description),
        order: i(m.order),
        courseId: m.courseId,
        passingScore: f(m.passingScore, 60),
        questionCount: i(m.questionCount, 10),
        createdAt: dRequired(m.createdAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Modules:            ${modules.length}`)
  }

  // ── 5. Videos ─────────────────────────────────────────────────────────────
  const videos = readCsv('video.csv')
  if (videos.length > 0) {
    await prisma.video.createMany({
      data: videos.map((v: any) => ({
        id: v.id,
        title: v.title,
        youtubeUrl: v.youtubeUrl,
        description: n(v.description),
        order: i(v.order, 0),
        durationSeconds: i(v.durationSeconds, 0),
        moduleId: v.moduleId,
        createdAt: dRequired(v.createdAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Videos:             ${videos.length}`)
  }

  // ── 6. Questions ──────────────────────────────────────────────────────────
  const questions = readCsv('question.csv')
  if (questions.length > 0) {
    await prisma.question.createMany({
      data: questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        moduleId: q.moduleId,
        explanation: n(q.explanation),
        videoId: n(q.videoId),
        timestamp: n(q.timestamp) != null ? i(q.timestamp) : null,
        createdAt: dRequired(q.createdAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Questions:          ${questions.length}`)
  }

  // ── 7. Question Options ───────────────────────────────────────────────────
  const options = readCsv('questionOption.csv')
  if (options.length > 0) {
    await prisma.questionOption.createMany({
      data: options.map((o: any) => ({
        id: o.id,
        text: o.text,
        isCorrect: b(o.isCorrect),
        order: i(o.order, 0),
        questionId: o.questionId,
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Question Options:   ${options.length}`)
  }

  // ── 8. Coding Questions ───────────────────────────────────────────────────
  const codingQuestions = readCsv('codingquestion.csv')
  if (codingQuestions.length > 0) {
    await prisma.codingQuestion.createMany({
      data: codingQuestions.map((cq: any) => ({
        id: cq.id,
        moduleId: cq.moduleId,
        type: cq.type ?? 'coding',
        difficulty: cq.difficulty ?? 'medium',
        mode: cq.mode ?? 'both',
        title: cq.title,
        description: cq.description,
        examples: cq.examples ?? '[]',
        constraints: n(cq.constraints),
        starterCode: cq.starterCode ?? '',
        hints: cq.hints ?? '[]',
        sampleSolution: cq.sampleSolution ?? '',
        expectedOutput: n(cq.expectedOutput),
        sqlSchema: n(cq.sqlSchema),
        hiddenTestCases: n(cq.hiddenTestCases),
        order: i(cq.order, 0),
        createdAt: dRequired(cq.createdAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Coding Questions:   ${codingQuestions.length}`)
  }

  // ── 9. Course Assignments ─────────────────────────────────────────────────
  const assignments = readCsv('courseassignment.csv')
  if (assignments.length > 0) {
    await prisma.courseAssignment.createMany({
      data: assignments.map((a: any) => ({
        id: a.id,
        courseId: a.courseId,
        userId: a.userId,
        createdAt: dRequired(a.createdAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Course Assignments: ${assignments.length}`)
  }

  // ── 10. Enrollments ───────────────────────────────────────────────────────
  const enrollments = readCsv('enrollment.csv')
  if (enrollments.length > 0) {
    await prisma.enrollment.createMany({
      data: enrollments.map((e: any) => ({
        id: e.id,
        userId: e.userId,
        courseId: e.courseId,
        enrolledAt: dRequired(e.enrolledAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Enrollments:        ${enrollments.length}`)
  }

  // ── 11. Module Progress ───────────────────────────────────────────────────
  const progress = readCsv('moduleprogress.csv')
  if (progress.length > 0) {
    await prisma.moduleProgress.createMany({
      data: progress.map((p: any) => ({
        id: p.id,
        enrollmentId: p.enrollmentId,
        moduleId: p.moduleId,
        videosWatched: p.videosWatched ?? '[]',
        videoCompleted: b(p.videoCompleted),
        testPassed: b(p.testPassed),
        testScore: n(p.testScore) != null ? f(p.testScore) : null,
        completedAt: d(p.completedAt),
        timeSpentSeconds: i(p.timeSpentSeconds, 0),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Module Progress:    ${progress.length}`)
  }

  // ── 12. Test Attempts ─────────────────────────────────────────────────────
  const testAttempts = readCsv('testAttempt.csv')
  if (testAttempts.length > 0) {
    await prisma.testAttempt.createMany({
      data: testAttempts.map((a: any) => ({
        id: a.id,
        userId: a.userId,
        moduleId: a.moduleId,
        score: f(a.score),
        totalQuestions: i(a.totalQuestions),
        correctAnswers: i(a.correctAnswers),
        passed: b(a.passed),
        timeSpentSeconds: i(a.timeSpentSeconds, 0),
        createdAt: dRequired(a.createdAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Test Attempts:      ${testAttempts.length}`)
  }

  // ── 13. Test Answers ──────────────────────────────────────────────────────
  const testAnswers = readCsv('testAnswer.csv')
  if (testAnswers.length > 0) {
    await prisma.testAnswer.createMany({
      data: testAnswers.map((a: any) => ({
        id: a.id,
        testAttemptId: a.testAttemptId,
        questionId: a.questionId,
        selectedOptionId: n(a.selectedOptionId),
        isCorrect: b(a.isCorrect),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Test Answers:       ${testAnswers.length}`)
  }

  // ── 14. Certificates ──────────────────────────────────────────────────────
  const certs = readCsv('certificate.csv')
  if (certs.length > 0) {
    await prisma.certificate.createMany({
      data: certs.map((c: any) => ({
        id: c.id,
        userId: c.userId,
        courseId: c.courseId,
        certificateNo: c.certificateNo,
        status: c.status as 'PENDING' | 'VERIFIED' | 'REVOKED',
        revokedReason: n(c.revokedReason),
        issuedAt: dRequired(c.issuedAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Certificates:       ${certs.length}`)
  }

  // ── 15. Activity Logs ─────────────────────────────────────────────────────
  const activityLogs = readCsv('activitylog.csv')
  if (activityLogs.length > 0) {
    await prisma.activityLog.createMany({
      data: activityLogs.map((l: any) => ({
        id: l.id,
        userId: l.userId,
        action: l.action,
        detail: n(l.detail),
        points: i(l.points, 0),
        createdAt: dRequired(l.createdAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Activity Logs:      ${activityLogs.length}`)
  }

  // ── 16. Monthly Points ────────────────────────────────────────────────────
  const monthlyPoints = readCsv('monthlypoints.csv')
  if (monthlyPoints.length > 0) {
    await prisma.monthlyPoints.createMany({
      data: monthlyPoints.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        month: i(m.month),
        year: i(m.year),
        points: i(m.points, 0),
        rank: n(m.rank) != null ? i(m.rank) : null,
        createdAt: dRequired(m.createdAt),
        updatedAt: dRequired(m.updatedAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Monthly Points:     ${monthlyPoints.length}`)
  }

  // ── 17. Coding Drafts ─────────────────────────────────────────────────────
  const codingDrafts = readCsv('codingdraft.csv')
  if (codingDrafts.length > 0) {
    await prisma.codingDraft.createMany({
      data: codingDrafts.map((cd: any) => ({
        id: cd.id,
        userId: cd.userId,
        moduleId: cd.moduleId,
        solutions: cd.solutions ?? '{}',
        languages: cd.languages ?? '{}',
        updatedAt: dRequired(cd.updatedAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Coding Drafts:      ${codingDrafts.length}`)
  }

  // ── 18. Coding Attempts ───────────────────────────────────────────────────
  const codingAttempts = readCsv('CodingAttempt.csv')
  if (codingAttempts.length > 0) {
    await prisma.codingAttempt.createMany({
      data: codingAttempts.map((ca: any) => ({
        id: ca.id,
        userId: ca.userId,
        moduleId: ca.moduleId,
        score: f(ca.score, 0),
        totalProblems: i(ca.totalProblems, 0),
        passed: b(ca.passed),
        feedback: n(ca.feedback),
        completedAt: dRequired(ca.completedAt),
      })),
      skipDuplicates: true,
    })
    console.log(`✅ Coding Attempts:    ${codingAttempts.length}`)
  }

  // ── 19. Practice Attempts ─────────────────────────────────────────────────
  // PracticeAttempt table is empty in the source database — table created, no rows to insert.
  console.log(`✅ Practice Attempts:  0 (empty in source)`)

  console.log('\n🎉 Migration complete!\n')
}

main()
  .catch((e) => {
    console.error('\n❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

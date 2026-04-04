import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware-helpers'
import path from 'path'

export const runtime = 'nodejs'

// Singleton SQL engine (lazy loaded)
let sqlEngine: Awaited<ReturnType<typeof loadSqlJs>> | null = null

async function loadSqlJs() {
  const initSqlJs = (await import('sql.js')).default
  return initSqlJs({
    locateFile: (file: string) =>
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  })
}

async function getSqlEngine() {
  if (!sqlEngine) sqlEngine = await loadSqlJs()
  return sqlEngine
}

function normalizeValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  return String(v).trim()
}

function rowsMatch(
  actual: Record<string, unknown>[],
  expected: Record<string, unknown>[],
): boolean {
  if (actual.length !== expected.length) return false
  const norm = (r: Record<string, unknown>) =>
    JSON.stringify(
      Object.keys(r)
        .sort()
        .reduce<Record<string, string>>((acc, k) => { acc[k] = normalizeValue(r[k]); return acc }, {}),
    )
  const actualSorted = actual.map(norm).sort().join('|')
  const expectedSorted = expected.map(norm).sort().join('|')
  return actualSorted === expectedSorted
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req)
  if (error) return error

  const { schema, query, expectedOutput } = await req.json()

  if (!query?.trim()) {
    return NextResponse.json({ columns: [], rows: [], matched: false, error: 'No query provided' })
  }

  let SQL: Awaited<ReturnType<typeof loadSqlJs>>
  try {
    SQL = await getSqlEngine()
  } catch {
    return NextResponse.json({ columns: [], rows: [], matched: false, error: 'SQL engine failed to load' })
  }

  const db = new SQL.Database()
  try {
    // Run schema (CREATE TABLE + INSERT)
    if (schema?.trim()) {
      db.run(schema)
    }

    // Run student's query
    const results = db.exec(query.trim())

    if (results.length === 0) {
      return NextResponse.json({ columns: [], rows: [], matched: false, message: 'Query executed but returned no rows' })
    }

    const { columns, values } = results[0]
    const rows: Record<string, unknown>[] = values.map(row => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => { obj[col] = row[i] })
      return obj
    })

    // Compare with expected output
    let matched = false
    if (expectedOutput?.trim()) {
      try {
        const expected = JSON.parse(expectedOutput)
        if (Array.isArray(expected) && expected.length > 0) {
          matched = rowsMatch(rows, expected as Record<string, unknown>[])
        }
      } catch {
        // expectedOutput is not valid JSON — skip comparison
      }
    }

    return NextResponse.json({ columns, rows, matched })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SQL error'
    return NextResponse.json({ columns: [], rows: [], matched: false, error: message })
  } finally {
    db.close()
  }
}

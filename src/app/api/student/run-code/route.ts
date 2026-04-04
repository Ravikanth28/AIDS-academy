import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware-helpers'

const WANDBOX_COMPILERS: Record<string, { compiler: string; options?: string }> = {
  python:     { compiler: 'cpython-3.12.7' },
  javascript: { compiler: 'nodejs-20.17.0' },
  typescript: { compiler: 'typescript-5.6.2' },
  java:       { compiler: 'openjdk-jdk-21+35' },
  cpp:        { compiler: 'gcc-13.2.0', options: '-std=c++17 -O2' },
  c:          { compiler: 'gcc-13.2.0-c', options: '-std=c11 -O2' },
}

const WANDBOX_TIMEOUT_MS = 15_000

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req)
  if (error) return error

  const { language, code, stdin } = await req.json()

  if (language === 'sql' || !WANDBOX_COMPILERS[language as string]) {
    return NextResponse.json({
      output: '',
      stderr: 'SQL queries cannot be run directly — AI evaluation will assess your query on submission.',
      exitCode: 0,
    })
  }

  if (!code?.trim()) {
    return NextResponse.json({ output: '', stderr: 'No code provided.', exitCode: 1 })
  }

  const cfg = WANDBOX_COMPILERS[language]

  try {
    const body: Record<string, unknown> = {
      compiler: cfg.compiler,
      code,
      save: false,
    }
    if (cfg.options) body.options = cfg.options
    if (stdin?.trim()) body.stdin = stdin

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), WANDBOX_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ output: '', stderr: `Compiler error: ${text}`, exitCode: 1 })
    }

    const data = await res.json()
    const exitCode = parseInt(data.status ?? '0', 10) || 0
    const output   = data.program_output ?? ''
    const stderr   = [data.compiler_error, data.program_error].filter(Boolean).join('\n')

    return NextResponse.json({ output, stderr, exitCode })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ output: '', stderr: 'Execution timed out (15s). Your code may have an infinite loop.', exitCode: 1 })
    }
    return NextResponse.json({ output: '', stderr: 'Could not connect to execution server.', exitCode: 1 })
  }
}

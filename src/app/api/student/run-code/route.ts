import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware-helpers'

const WANDBOX_COMPILERS: Record<string, { compiler: string; options?: string }> = {
  python:     { compiler: 'cpython-3.12.0' },
  javascript: { compiler: 'nodejs-20.6.1' },
  typescript: { compiler: 'typescript-5.1.6' },
  java:       { compiler: 'openjdk-21.0.1' },
  cpp:        { compiler: 'gcc-13.2.0', options: '-std=c++17 -O2' },
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req)
  if (authResult instanceof NextResponse) return authResult

  const { language, code } = await req.json()

  if (language === 'sql' || !WANDBOX_COMPILERS[language]) {
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

    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ output: '', stderr: `Compiler error: ${text}`, exitCode: 1 })
    }

    const data = await res.json()
    const exitCode = parseInt(data.status ?? '0', 10) || 0
    const output   = data.program_output ?? ''
    const stderr   = [data.compiler_error, data.program_error].filter(Boolean).join('\n')

    return NextResponse.json({ output, stderr, exitCode })
  } catch {
    return NextResponse.json({ output: '', stderr: 'Could not connect to execution server.', exitCode: 1 })
  }
}

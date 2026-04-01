'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold gradient-text">500</h1>
        <h2 className="text-2xl font-semibold text-white">Something went wrong</h2>
        <p className="text-white/50">An unexpected error occurred. Please try again.</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-medium transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}

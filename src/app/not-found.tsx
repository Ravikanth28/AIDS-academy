import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold gradient-text">404</h1>
        <h2 className="text-2xl font-semibold text-white">Page Not Found</h2>
        <p className="text-white/50">The page you are looking for does not exist.</p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}

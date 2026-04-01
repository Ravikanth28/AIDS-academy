import Link from 'next/link'

export default function Custom500() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A1B', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 700, background: 'linear-gradient(to right, #8B5CF6, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>500</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.5rem' }}>Something went wrong</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>An unexpected error occurred. Please try again.</p>
        <Link href="/" style={{ display: 'inline-block', marginTop: '1.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: '#7C3AED', color: '#fff', fontWeight: 500, textDecoration: 'none' }}>
          Go Home
        </Link>
      </div>
    </div>
  )
}

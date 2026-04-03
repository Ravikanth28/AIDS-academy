const DEFAULT_APP_URL = 'https://aids-academy.onrender.com'

export function getPublicAppUrl() {
  const configuredUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '')

  if (!configuredUrl) return DEFAULT_APP_URL

  try {
    const hostname = new URL(configuredUrl).hostname.toLowerCase()
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'

    if (process.env.NODE_ENV === 'production' && isLocalhost) {
      return DEFAULT_APP_URL
    }
  } catch {
    return DEFAULT_APP_URL
  }

  return configuredUrl
}

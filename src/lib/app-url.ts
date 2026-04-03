const DEFAULT_APP_URL = 'https://aids-academy.onrender.com'

export function getPublicAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '')
}


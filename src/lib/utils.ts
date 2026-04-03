/**
 * Extracts a YouTube video ID from various YouTube URL formats.
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  } catch {
    return null
  }
}

export function getYouTubeThumbnail(url: string): string {
  const id = getYouTubeVideoId(url)
  if (!id) return '/placeholder-video.jpg'
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

export function getYouTubeEmbedUrl(url: string): string {
  const id = getYouTubeVideoId(url)
  if (!id) return ''
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&cc_load_policy=0&fs=0`
}

/**
 * Fisher-Yates shuffle - shuffles an array in place.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return phone
  return phone.slice(0, 2) + '****' + phone.slice(-2)
}

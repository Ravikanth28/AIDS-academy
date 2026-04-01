import { YoutubeTranscript } from 'youtube-transcript'
import { getYouTubeVideoId } from './utils'

export interface TranscriptSegment {
  text: string
  offset: number
  duration: number
}

export async function getTranscript(youtubeUrl: string): Promise<TranscriptSegment[]> {
  const videoId = getYouTubeVideoId(youtubeUrl)
  if (!videoId) throw new Error('Invalid YouTube URL')

  const segments = await YoutubeTranscript.fetchTranscript(videoId)
  return segments.map((s) => ({
    text: s.text,
    offset: s.offset,
    duration: s.duration,
  }))
}

export function transcriptToText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim()
}

export function transcriptWithTimestamps(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const mins = Math.floor(s.offset / 60000)
      const secs = Math.floor((s.offset % 60000) / 1000)
      const ts = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      return `[${ts}] ${s.text}`
    })
    .join('\n')
}

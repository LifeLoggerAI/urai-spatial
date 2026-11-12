import type { SelectedMemory, SelectedMemoryMedia } from '../memory/selectedMemoryContract'

type LifeMovieMediaMemory = Pick<SelectedMemory, 'demo' | 'authorization' | 'privacy' | 'sourceMedia' | 'sourceMediaReceipts'>
type OwnedPlayback = {
  status: 'absent' | 'loading' | 'ready' | 'unavailable'
  media: readonly SelectedMemoryMedia[]
}

function preferredMedia(items: readonly SelectedMemoryMedia[]): SelectedMemoryMedia | null {
  return items.find(item => item.kind === 'video')
    ?? items.find(item => item.kind === 'image')
    ?? items.find(item => item.kind === 'audio')
    ?? null
}

/**
 * Keep legacy demo URLs and private owner media in distinct trust paths.
 * Private playback must originate from the current owner-authorized playback
 * hook, which returns a revocable blob URL after validating live policy,
 * consent, object generation, deletion fence and authenticated identity.
 * Never fall back to persisted sourceMedia URLs for a real memory.
 */
export function selectLifeMovieMedia(memory: LifeMovieMediaMemory | null, playback: OwnedPlayback): SelectedMemoryMedia | null {
  if (!memory) return null
  if (memory.demo) return preferredMedia(memory.sourceMedia)
  if (memory.authorization !== 'owner' || memory.privacy !== 'private' || playback.status !== 'ready') return null

  // Mirrors the single receipt chosen by useOwnedMemoryMediaPlayback.
  // A stale, differently typed or URL-backed result cannot cross this boundary.
  const receipt = memory.sourceMediaReceipts?.find(item => item.kind === 'video')
    ?? memory.sourceMediaReceipts?.find(item => item.kind === 'image')
    ?? memory.sourceMediaReceipts?.find(item => item.kind === 'audio')
  if (!receipt) return null
  return playback.media.find(item => item.kind === receipt.kind && item.url.startsWith('blob:') && !/\s/.test(item.url)) ?? null
}

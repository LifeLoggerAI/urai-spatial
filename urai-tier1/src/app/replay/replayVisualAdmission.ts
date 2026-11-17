import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'

export type ReplayVisualAdmission =
  | { kind: 'recorded-source'; media: SelectedMemoryMedia }
  | { kind: 'disclosed-demo'; media: SelectedMemoryMedia | null }
  | { kind: 'neutral'; media: null }

export function replayVisualAdmission(memory: SelectedMemory): ReplayVisualAdmission {
  const media = memory.sourceMedia.find((item) => item.kind === 'video' || item.kind === 'image')
  if (media) return { kind: 'recorded-source', media }
  // This bundled film is an explicitly synthetic public fixture, never a recording.
  // Do not use it for other demo IDs or as a substitute for an owner's original media.
  if (memory.demo && memory.id === 'demo:quiet-reset') {
    return { kind: 'disclosed-demo', media: {
      kind: 'video',
      url: '/assets/urai/demo/quiet-reset-synthetic-video.webm',
      caption: 'Synthetic demonstration film. Fictional memory, no personal recording.',
    } }
  }
  return memory.demo ? { kind: 'disclosed-demo', media: null } : { kind: 'neutral', media: null }
}

/** Reset and tear down playback across ownership, source, privacy, and manifest changes. */
export function replaySessionIdentity(memory: SelectedMemory) {
  return JSON.stringify([
    memory.ownerId,
    memory.id,
    memory.demo,
    memory.privacy,
    memory.replayManifest.id,
    memory.replayManifest.version,
    memory.replayManifest.durationMs,
    memory.sourceMedia.map(({ kind, url, caption }) => [kind, url, caption ?? null]),
  ])
}

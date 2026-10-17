import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'

export type ReplayVisualAdmission =
  | { kind: 'recorded-source'; media: SelectedMemoryMedia }
  | { kind: 'disclosed-demo'; media: null }
  | { kind: 'neutral'; media: null }

export function replayVisualAdmission(memory: SelectedMemory): ReplayVisualAdmission {
  const media = memory.sourceMedia.find((item) => item.kind === 'video' || item.kind === 'image' || item.kind === 'audio')
  if (media) return { kind: 'recorded-source', media }
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
    ...(memory.sourceMediaReceipts?.length ? [memory.sourceMediaReceipts.map(({ kind, mediaReceiptId, caption }) => [kind, mediaReceiptId, caption ?? null])] : []),
  ])
}

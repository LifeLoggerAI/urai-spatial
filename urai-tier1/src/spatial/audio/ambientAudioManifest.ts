import type { AmbientTrack } from './audioTypes'

export type AmbientAudioAssetStatus = 'ready' | 'missing'

export interface AmbientAudioAsset {
  readonly id: string
  readonly track: AmbientTrack
  readonly placeholderPath: string
  readonly status: AmbientAudioAssetStatus
  readonly path: string | null
  readonly fallback: 'silence'
  readonly reason: string
}

export const ambientAudioManifest: Readonly<Record<AmbientTrack, AmbientAudioAsset>> = {
  home: {
    id: 'ambient-home-v1',
    track: 'home',
    placeholderPath: '/audio/ambient/home.mp3',
    status: 'missing',
    path: null,
    fallback: 'silence',
    reason: 'Repository file is a zero-byte placeholder and is excluded from runtime playback.',
  },
  ascent: {
    id: 'ambient-ascent-v1',
    track: 'ascent',
    placeholderPath: '/audio/ambient/ascent.mp3',
    status: 'missing',
    path: null,
    fallback: 'silence',
    reason: 'Repository file is a zero-byte placeholder and is excluded from runtime playback.',
  },
  lifemap: {
    id: 'ambient-lifemap-v1',
    track: 'lifemap',
    placeholderPath: '/audio/ambient/lifemap.mp3',
    status: 'missing',
    path: null,
    fallback: 'silence',
    reason: 'Repository file is a zero-byte placeholder and is excluded from runtime playback.',
  },
  focus: {
    id: 'ambient-focus-v1',
    track: 'focus',
    placeholderPath: '/audio/ambient/focus.mp3',
    status: 'missing',
    path: null,
    fallback: 'silence',
    reason: 'Repository file is a zero-byte placeholder and is excluded from runtime playback.',
  },
  replay: {
    id: 'ambient-replay-v1',
    track: 'replay',
    placeholderPath: '/audio/ambient/replay.mp3',
    status: 'missing',
    path: null,
    fallback: 'silence',
    reason: 'Repository file is a zero-byte placeholder and is excluded from runtime playback.',
  },
}

export function resolveReadyAmbientAudioPath(track: AmbientTrack): string | null {
  const asset = ambientAudioManifest[track]
  return asset.status === 'ready' ? asset.path : null
}

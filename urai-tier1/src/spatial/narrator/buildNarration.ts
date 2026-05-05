import { SpatialAssetManifest } from '../assets/manifestTypes'

export type NarratorTone = 'whisper' | 'calm' | 'intense'

export interface NarrationLine {
  text: string
  rate: number
  pitch: number
  volume: number
  pauseMs: number
  tone: NarratorTone
}

function inferTone(manifest: SpatialAssetManifest): NarratorTone {
  const text = `${manifest.promptPreview || ''} ${manifest.assetType}`.toLowerCase()

  if (text.includes('grief') || text.includes('dream') || text.includes('memory') || text.includes('soft')) return 'whisper'
  if (text.includes('battle') || text.includes('storm') || text.includes('fire') || text.includes('launch')) return 'intense'
  return 'calm'
}

function voiceForTone(tone: NarratorTone) {
  if (tone === 'whisper') return { rate: 0.72, pitch: 0.82, volume: 0.55 }
  if (tone === 'intense') return { rate: 0.95, pitch: 0.9, volume: 0.86 }
  return { rate: 0.84, pitch: 0.92, volume: 0.72 }
}

export function buildNarrationSequence(manifest: SpatialAssetManifest): NarrationLine[] {
  const prompt = manifest.promptPreview?.trim() || 'a new memory has arrived'
  const tone = inferTone(manifest)
  const voice = voiceForTone(tone)

  return [
    {
      ...voice,
      tone,
      pauseMs: 150,
      text: tone === 'whisper' ? 'Something quiet is entering the field.' : tone === 'intense' ? 'A charged signal has arrived.' : 'A new signal has entered the field.',
    },
    {
      ...voice,
      tone,
      pauseMs: tone === 'intense' ? 450 : 650,
      text: prompt,
    },
    {
      ...voice,
      tone,
      pauseMs: 550,
      text: manifest.spatialCompatibility?.supported
        ? `It is ready to take form as ${manifest.spatialCompatibility.type.replace('_', ' ')}.`
        : 'It is present, but not yet spatially resolved.',
    },
  ]
}

export function buildNarration(manifest: SpatialAssetManifest): NarrationLine {
  return buildNarrationSequence(manifest)[0]
}

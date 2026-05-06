import { SpatialAssetManifest } from '../assets/manifestTypes'

export type NarratorTone = 'whisper' | 'calm' | 'intense'
export type NarratorContext = 'arrival' | 'return' | 'explore'

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

function openingForContext(context: NarratorContext, tone: NarratorTone) {
  if (context === 'return') {
    return tone === 'whisper' ? "You've returned to a quiet moment." : tone === 'intense' ? "You've returned to a charged moment." : "You've returned to this moment."
  }

  if (context === 'explore') {
    return 'The constellation is open. Choose a signal to enter.'
  }

  return tone === 'whisper' ? 'Something quiet is entering the field.' : tone === 'intense' ? 'A charged signal has arrived.' : 'A new signal has entered the field.'
}

export function buildNarrationSequence(manifest: SpatialAssetManifest, context: NarratorContext = 'arrival'): NarrationLine[] {
  const prompt = manifest.promptPreview?.trim() || 'a new memory has arrived'
  const tone = inferTone(manifest)
  const voice = voiceForTone(tone)

  return [
    {
      ...voice,
      tone,
      pauseMs: context === 'return' ? 100 : 150,
      text: openingForContext(context, tone),
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

export function buildNarration(manifest: SpatialAssetManifest, context: NarratorContext = 'arrival'): NarrationLine {
  return buildNarrationSequence(manifest, context)[0]
}

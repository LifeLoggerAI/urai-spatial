import { SpatialAssetManifest } from '../assets/manifestTypes'

export interface NarrationLine {
  text: string
  rate: number
  pitch: number
  volume: number
}

function toneForType(type: string) {
  if (type === 'video') return { rate: 0.88, pitch: 0.92, volume: 0.78 }
  if (type === 'model3d') return { rate: 0.82, pitch: 0.86, volume: 0.78 }
  if (type === 'audio' || type === 'tts') return { rate: 0.8, pitch: 0.9, volume: 0.72 }
  return { rate: 0.86, pitch: 0.94, volume: 0.76 }
}

export function buildNarration(manifest: SpatialAssetManifest): NarrationLine {
  const prompt = manifest.promptPreview?.trim() || 'a new memory has arrived'
  const tone = toneForType(manifest.assetType)

  return {
    ...tone,
    text: `A new ${manifest.assetType} has entered the field. ${prompt}. Let it settle into view.`,
  }
}

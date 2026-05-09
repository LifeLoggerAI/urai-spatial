export type DirectorMode = 'life-map' | 'focus' | 'replay' | 'mirror' | 'dream' | 'relationship' | 'recovery'
export type DirectorQuality = 'low' | 'balanced' | 'ultra'

export interface CinematicDirectorPreset {
  mode: DirectorMode
  quality: DirectorQuality
  cameraDolly: number
  bloom: number
  depthOfField: number
  particleBudget: number
  vignette: number
  motionSafe: boolean
  transitionCue: string
}

const qualityMultiplier: Record<DirectorQuality, number> = {
  low: 0.45,
  balanced: 0.72,
  ultra: 1,
}

const baseParticleBudget: Record<DirectorMode, number> = {
  'life-map': 900,
  focus: 650,
  replay: 1200,
  mirror: 520,
  dream: 980,
  relationship: 860,
  recovery: 720,
}

export function buildCinematicDirectorPreset({
  mode,
  quality = 'balanced',
  reducedMotion = false,
}: {
  mode: DirectorMode
  quality?: DirectorQuality
  reducedMotion?: boolean
}): CinematicDirectorPreset {
  const multiplier = reducedMotion ? 0.12 : qualityMultiplier[quality]
  const replayBias = mode === 'replay' ? 1.18 : 1
  const dreamBias = mode === 'dream' ? 1.08 : 1

  return {
    mode,
    quality,
    cameraDolly: reducedMotion ? 0 : Number((0.8 * replayBias * dreamBias).toFixed(2)),
    bloom: Number((0.45 * multiplier * replayBias).toFixed(2)),
    depthOfField: reducedMotion ? 0 : Number((0.35 * multiplier).toFixed(2)),
    particleBudget: Math.round(baseParticleBudget[mode] * multiplier),
    vignette: Number((0.38 * multiplier).toFixed(2)),
    motionSafe: reducedMotion,
    transitionCue: reducedMotion ? 'crossfade-only' : mode === 'replay' ? 'star-fly-in-aura-bloom' : `${mode}-soft-dolly`,
  }
}

export function directorPresetCssVars(preset: CinematicDirectorPreset) {
  return {
    '--urai-director-bloom': String(preset.bloom),
    '--urai-director-depth': String(preset.depthOfField),
    '--urai-director-vignette': String(preset.vignette),
    '--urai-director-particles': String(preset.particleBudget),
  } as Record<string, string>
}

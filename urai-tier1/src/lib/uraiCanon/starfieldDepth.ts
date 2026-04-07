export type SpatialPhase = 'home' | 'lifemap' | 'focus' | 'replay'

export type DepthBandSpec = {
  id: 'far' | 'mid' | 'near'
  count: number
  zMin: number
  zMax: number
  parallax: number
  drift: number
  opacity: number
  spreadX: number
  spreadY: number
  pointSize: number
}

export const PRIMARY_STAR_DEPTH = {
  zMin: -60,
  zMax: -20,
  baseRadius: 0.22,
}

export const STARFIELD_IDLE = {
  drift: 0.002,
  pulse: 0.015,
  xAmp: 0.6,
  yAmp: 0.4,
  zAmp: 0.25,
}

export const STARFIELD_DEPTH_BANDS: DepthBandSpec[] = [
  { id: 'far',  count: 320, zMin: -160, zMax: -110, parallax: 0.02, drift: 0.01, opacity: 0.08, spreadX: 96, spreadY: 164, pointSize: 0.6 },
  { id: 'mid',  count: 180, zMin: -100, zMax: -60,  parallax: 0.05, drift: 0.02, opacity: 0.18, spreadX: 34, spreadY: 82,  pointSize: 0.9 },
  { id: 'near', count: 100, zMin: -50,  zMax: -20,  parallax: 0.09, drift: 0.03, opacity: 0.35, spreadX: 18, spreadY: 48,  pointSize: 1.2 },
]

export const STARFIELD_PHASE_ALPHA: Record<SpatialPhase, number> = {
  home: 0.2,
  lifemap: 1,
  focus: 0.7,
  replay: 0.5,
}

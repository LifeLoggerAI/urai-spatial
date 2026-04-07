export type SpatialPhase = 'home' | 'lifemap' | 'focus' | 'replay'

export const STARFIELD_DEPTH_BANDS = [
  { id: 'far',  count: 320, zMin: -160, zMax: -110, parallax: 0.02 },
  { id: 'mid',  count: 180, zMin: -100, zMax: -60,  parallax: 0.05 },
  { id: 'near', count: 100, zMin: -50,  zMax: -20,  parallax: 0.09 },
]

export const STARFIELD_PHASE_ALPHA = {
  home: 0.2,
  lifemap: 1,
  focus: 0.7,
  replay: 0.5,
}

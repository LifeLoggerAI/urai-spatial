export type SpatialPhase = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay'

export type DepthBand = 'near' | 'mid' | 'far'

export type LifeMapStar = {
  id: string
  x?: number
  y?: number
  z?: number
  position?: [number, number, number]
  title?: string
  label?: string
  intensity?: number
  size?: number
  opacity?: number
  color?: string
  band?: DepthBand
  depthBand?: DepthBand
  kind?: string
  phase?: SpatialPhase | string
  [key: string]: unknown
}

export type LifeMapStarLike = LifeMapStar

export type Star = LifeMapStar

import { useMemo, useRef } from 'react'

export type SpatialMode = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay'

type CameraTravel = {
  fromMode: SpatialMode
  toMode: SpatialMode
  progress: number
  isTransitioning: boolean
}

export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

type CameraCanonResult = {
  pose: CameraPose
  fromMode: SpatialMode
  toMode: SpatialMode
  progress: number
  isTransitioning: boolean
}

type SelectedStarLike = {
  position?: [number, number, number] | number[]
} | null | undefined

type UseCameraCanonArgs = {
  mode: string
  selectedStar?: SelectedStarLike
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const normalizeMode = (mode: string): SpatialMode => {
  if (mode === 'home') return 'home'
  if (mode === 'ascent') return 'ascent'
  if (mode === 'lifemap') return 'lifemap'
  if (mode === 'focus') return 'focus'
  if (mode === 'replay') return 'replay'
  return 'home'
}

const basePose = (mode: SpatialMode): CameraPose => {
  switch (mode) {
    case 'home':
      return {
        position: [0, 1.25, 10.5],
        target: [0, 0.25, 0],
        fov: 46,
      }
    case 'ascent':
      return {
        position: [0, 2.8, 8.0],
        target: [0, 1.1, -4.5],
        fov: 44,
      }
    case 'lifemap':
      return {
        position: [0, 0.35, 7.2],
        target: [0, 0, -22],
        fov: 56,
      }
    case 'focus':
      return {
        position: [0.15, 0.05, 4.45],
        target: [0.15, 0, -6.2],
        fov: 42,
      }
    case 'replay':
      return {
        position: [0, 0, 2.15],
        target: [0, 0, -18],
        fov: 38,
      }
  }
}

const lerpPose = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: [
    lerp(a.position[0], b.position[0], t),
    lerp(a.position[1], b.position[1], t),
    lerp(a.position[2], b.position[2], t),
  ],
  target: [
    lerp(a.target[0], b.target[0], t),
    lerp(a.target[1], b.target[1], t),
    lerp(a.target[2], b.target[2], t),
  ],
  fov: lerp(a.fov, b.fov, t),
})

const starPositionOf = (
  star: SelectedStarLike
): [number, number, number] | null => {
  const p = star?.position
  if (!Array.isArray(p) || p.length < 3) return null

  const x = Number(p[0])
  const y = Number(p[1])
  const z = Number(p[2])

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null
  }

  return [x, y, z]
}

const convergePose = (
  pose: CameraPose,
  mode: SpatialMode,
  selectedStar: SelectedStarLike
): CameraPose => {
  const pos = starPositionOf(selectedStar)
  if (!pos) return pose
  if (mode !== 'focus' && mode !== 'replay') return pose

  if (mode === 'focus') {
    return {
      position: [pos[0], pos[1] + 0.16, pos[2] + 2.55],
      target: [pos[0], pos[1], pos[2]],
      fov: 39,
    }
  }

  return {
    position: [pos[0], pos[1] + 0.04, pos[2] + 1.05],
    target: [pos[0], pos[1], pos[2] - 0.22],
    fov: 33,
  }
}

export default function useCameraCanon(
  args: UseCameraCanonArgs
): CameraCanonResult {
  const mode = normalizeMode(args.mode)
  const selectedStar = args.selectedStar

  const travelRef = useRef<CameraTravel>({
    fromMode: mode,
    toMode: mode,
    progress: 1,
    isTransitioning: false,
  })

  const lastModeRef = useRef<SpatialMode>(mode)

  if (lastModeRef.current !== mode) {
    travelRef.current = {
      fromMode: lastModeRef.current,
      toMode: mode,
      progress: 0,
      isTransitioning: true,
    }
    lastModeRef.current = mode
  }

  if (travelRef.current.isTransitioning) {
    const isAscentLeg =
      (travelRef.current.fromMode === 'home' &&
        travelRef.current.toMode === 'ascent') ||
      (travelRef.current.fromMode === 'ascent' &&
        travelRef.current.toMode === 'lifemap')

    const step = isAscentLeg ? 0.08 : 0.16
    const nextProgress = clamp01(travelRef.current.progress + step)

    travelRef.current = {
      ...travelRef.current,
      progress: nextProgress,
      isTransitioning: nextProgress < 1,
    }
  }

  return useMemo(() => {
    const travel = travelRef.current
    const raw = clamp01(travel.progress)
    const t = easeInOut(raw)

    const fromPose = basePose(travel.fromMode)
    const toPose = basePose(travel.toMode)
    const interpolated = lerpPose(fromPose, toPose, t)

    const pose =
      raw >= 1 ? convergePose(toPose, travel.toMode, selectedStar) : interpolated

    return {
      pose,
      fromMode: travel.fromMode,
      toMode: travel.toMode,
      progress: raw,
      isTransitioning: travel.isTransitioning,
    }
  }, [selectedStar, mode])
}

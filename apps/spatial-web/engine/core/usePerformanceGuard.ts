
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

const LOW_FPS_THRESHOLD = 40
const DURATION_MS = 3000

export function usePerformanceGuard(onDegrade: () => void) {
  const lowFpsStart = useRef<number | null>(null)
  const instabilityCount = useRef(0)

  useFrame((state, delta) => {
    const fps = 1 / delta

    if (fps < LOW_FPS_THRESHOLD) {
      if (!lowFpsStart.current) {
        lowFpsStart.current = performance.now()
      }

      if (performance.now() - lowFpsStart.current > DURATION_MS) {
        onDegrade()
        lowFpsStart.current = null
      }
    } else {
      lowFpsStart.current = null
    }

    if (delta > 0.05) { // 20fps equivalent
      instabilityCount.current++
    }

    if (instabilityCount.current > 120) {
      onDegrade()
      instabilityCount.current = 0
    }
  })
}

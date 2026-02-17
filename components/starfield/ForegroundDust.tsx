
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useEmotionalTimeEngine } from '@/components/time-core/useEmotionalTimeEngine';

export default function ForegroundDust() {
  const ref = useRef<any>()

  const { starState } = useEmotionalTimeEngine(["starState"])

  const particles = useMemo(() => {
    const count = 500
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i*3] = (Math.random() - 0.5) * 5
      arr[i*3+1] = (Math.random() - 0.5) * 5
      arr[i*3+2] = (Math.random() - 0.5) * 5
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.01
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles}
          count={particles.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        transparent
        opacity={0.25}
        depthWrite={false}
        color="#ffe6c7"
      />
    </points>
  )
}

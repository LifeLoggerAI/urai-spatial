
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function MidStars() {
  const ref = useRef<any>()

  const particles = useMemo(() => {
    const count = 4000
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i*3] = (Math.random() - 0.5) * 20
      arr[i*3+1] = (Math.random() - 0.5) * 20
      arr[i*3+2] = (Math.random() - 0.5) * 20
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.002
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

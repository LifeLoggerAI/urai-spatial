import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DustShader } from '../shaders/DustShader'

export default function Dust() {

  const meshRef = useRef<THREE.Points>(null!)

  const geometry = useMemo(() => {

    const geo = new THREE.BufferGeometry()
    const count = 500
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {

      positions[i * 3 + 0] = (Math.random() - 0.5) * 1000
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1000
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1000

    }

    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    )

    return geo

  }, [])

  useFrame(({ clock }) => {

    if (!meshRef.current) return

    const mat = meshRef.current.material as THREE.ShaderMaterial

    if (mat.uniforms?.u_time) {
      mat.uniforms.u_time.value = clock.elapsedTime
    }

  })

  return (

    <points
      ref={meshRef}
      geometry={geometry}
      frustumCulled={false}
    >

      <shaderMaterial

        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}

        uniforms={{
          ...DustShader.uniforms,
          u_time: { value: 0 }
        }}

        vertexShader={DustShader.vertexShader}
        fragmentShader={DustShader.fragmentShader}

      />

    </points>

  )

}
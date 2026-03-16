"use client"

import { useMemo, useRef, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { LightConeShader } from "../shaders/LightConeShader"

export default function LightCone() {

  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const geometry = useMemo(() => {
    return new THREE.CylinderGeometry(0, 1, 2, 32, 1, true)
  }, [])

  const shaderConfig = useMemo(() => {
    return {
      ...LightConeShader,
      uniforms: {
        ...LightConeShader.uniforms,
        u_time: { value: 0 },
      },
    }
  }, [])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = clock.getElapsedTime()
    }
  })

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        attach="material"
        args={[shaderConfig]}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}
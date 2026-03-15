"use client"

import { useMemo, useRef, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { StarCoronaShader } from "../shaders/StarCoronaShader"

export default function StarCorona() {

  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(1, 1)
  }, [])

  const shaderConfig = useMemo(() => {
    return {
      ...StarCoronaShader,
      uniforms: {
        ...StarCoronaShader.uniforms,
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
      scale={[500, 500, 500]}
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
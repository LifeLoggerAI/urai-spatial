"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { VolumetricNebulaShader } from "../shaders/VolumetricNebulaShader"

export default function Nebula() {

  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const shaderMaterial = useMemo(() => {

    const shader = VolumetricNebulaShader

    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(shader.uniforms),
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })

  }, [])

  useFrame(({ clock }) => {

    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = clock.getElapsedTime()
    }

  })

  return (

    <mesh
      ref={meshRef}
      scale={[1000, 1000, 1000]}
      frustumCulled={false}
      renderOrder={-10}
    >

      <boxGeometry args={[1, 1, 1]} />

      <primitive
        ref={materialRef}
        object={shaderMaterial}
        attach="material"
      />

    </mesh>

  )
}
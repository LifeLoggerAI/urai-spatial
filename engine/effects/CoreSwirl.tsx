"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useRef, useMemo } from "react"
import * as THREE from "three"

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position =
      projectionMatrix *
      modelViewMatrix *
      vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv - 0.5;

    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float swirl = sin(a * 6.0 + r * 12.0 - uTime * 0.8);
    swirl = swirl * 0.5 + 0.5;

    float core = smoothstep(0.55, 0.05, r);
    float glow = core * swirl;

    // Slight center enrichment so it does not feel too hollow
    glow += smoothstep(0.18, 0.0, r) * 0.35;

    vec3 color = uColor * glow;
    gl_FragColor = vec4(color, glow * uOpacity);
  }
`

export default function CoreSwirl() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const { camera } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(1.0, 0.88, 0.65) },
      uOpacity: { value: 0.35 },
    }),
    []
  )

  useFrame((state, delta) => {
    const mesh = meshRef.current
    const mat = matRef.current
    if (!mesh || !mat) return

    mat.uniforms.uTime.value = state.clock.elapsedTime

    // Frame-rate independent slow spin
    mesh.rotation.z += delta * 0.36

    // Keep plane facing camera so it reads as a core field
    mesh.quaternion.copy(camera.quaternion)
  })

  return (
    <mesh ref={meshRef} scale={90} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={true}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
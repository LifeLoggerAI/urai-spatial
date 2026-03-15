"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const vertexShader = `
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);

    gl_Position =
      projectionMatrix *
      modelViewMatrix *
      vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float time;
  uniform float strength;

  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // Rim shell
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 2.4);

    // Stable shell-space swirl from normal direction
    vec2 uv = vNormal.xy;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float spiral = sin(a * 6.0 - time * 0.8 + r * 14.0) * 0.5 + 0.5;
    float bands = sin(r * 18.0 - time * 1.2) * 0.5 + 0.5;

    float energy = mix(spiral, bands, 0.45);

    float glow = rim * (0.55 + energy * 0.45) * strength;

    vec3 col = vec3(0.7, 0.9, 1.0) * glow;

    gl_FragColor = vec4(col, glow * 0.55);
  }
`

export default function GalacticCoreLensing() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(35, 48, 48)
  }, [])

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      strength: { value: 0.45 },
    }),
    []
  )

  useFrame(({ clock }) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.time.value = clock.elapsedTime
  })

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={true}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
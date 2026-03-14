"use client"

import { useFrame } from "@react-three/fiber"
import { useRef, useMemo } from "react"
import * as THREE from "three"

const vertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPos;

void main(){

  vNormal = normalize(normalMatrix * normal);

  vec4 worldPos = modelMatrix * vec4(position,1.0);
  vWorldPos = worldPos.xyz;

  gl_Position =
    projectionMatrix *
    modelViewMatrix *
    vec4(position,1.0);

}
`

const fragmentShader = `
varying vec3 vNormal;
varying vec3 vWorldPos;

uniform float uTime;
uniform vec3 uColor;

void main(){

  vec3 viewDir =
    normalize(cameraPosition - vWorldPos);

  float rim =
    1.0 - max(dot(viewDir, vNormal), 0.0);

  rim = pow(rim, 2.6);

  float pulse =
    1.0 + sin(uTime * 2.5) * 0.08;

  float glow =
    rim * pulse;

  vec3 color =
    uColor * glow * 1.2;

  gl_FragColor =
    vec4(color, glow * 0.45);

}
`

export default function OrbAura(){

  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const geometry = useMemo(
    () => new THREE.SphereGeometry(2.2, 64, 64),
    []
  )

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color("#8fb5ff") }
  }), [])

  useFrame(({ clock }) => {

    if (!materialRef.current) return

    materialRef.current.uniforms.uTime.value =
      clock.getElapsedTime()

  })

  return (

    <mesh
      geometry={geometry}
      frustumCulled={false}
    >

      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
      />

    </mesh>

  )

}
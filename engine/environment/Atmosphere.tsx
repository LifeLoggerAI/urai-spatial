
'use client'

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const atmosphereStates = {
  home: {
    topColor: '#4a8dff',
    bottomColor: '#b83bff',
    intensity: 0.6,
  },
  lifereview: {
    topColor: '#ff8c4a',
    bottomColor: '#ff3b8d',
    intensity: 0.5,
  },
  launch: {
    topColor: '#ffffff',
    bottomColor: '#d4d4d4',
    intensity: 0.8,
  },
  default: {
    topColor: '#4a8dff',
    bottomColor: '#b83bff',
    intensity: 0.6,
  },
}

const getTargetAtmosphere = (sceneType) => {
  return atmosphereStates[sceneType] || atmosphereStates.default
}

export default function Atmosphere() {
  // In a real app, you'd get the sceneType from a state management store
  const sceneType = 'home' // Hardcoded for now
  const targetAtmosphere = useMemo(() => getTargetAtmosphere(sceneType), [sceneType])

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(targetAtmosphere.topColor) },
      bottomColor: { value: new THREE.Color(targetAtmosphere.bottomColor) },
      intensity: { value: targetAtmosphere.intensity },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float intensity;
      uniform float time;
      varying vec3 vWorldPosition;

      void main() {
        float h = normalize(vWorldPosition.xyz).y;
        float t = sin(time * 0.1) * 0.5 + 0.5; // Gentle undulation
        vec3 color = mix(bottomColor, topColor, max(pow(max(h, 0.0), 0.8) + t * 0.1, 0.0));
        gl_FragColor = vec4(color, intensity);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
  }), [targetAtmosphere])

  useFrame(({ clock }) => {
    material.uniforms.time.value = clock.getElapsedTime()
  })

  return (
    <mesh scale={[100, 100, 100]}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={material} />
    </mesh>
  )
}

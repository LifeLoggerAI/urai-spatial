import XRToggle from './components/XRToggle';
import WarpTunnel from './components/WarpTunnel';
import { useEffect } from 'react';
import WarpPulse from './components/WarpPulse';
import NebulaBackground from './components/NebulaBackground';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import SpaceFog from './components/SpaceFog';
import DeepSpaceDrift from './components/DeepSpaceDrift';
'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import * as THREE from 'three'

function SceneContent() {
  const { gl } = useThree()
  const [rotation, setRotation] = useState(0)

  const stars = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices = []

    for (let i = 0; i < 2000; i++) {
      vertices.push(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      )
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    )

    return geometry
  }, [])

  return (
    <points geometry={stars}>
      <pointsMaterial size={0.5} color="#ffffff" />
    </points>
  )
}

export default function XRScene() {
  return (
    <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
      <SceneContent />
    </Canvas>
  )
}

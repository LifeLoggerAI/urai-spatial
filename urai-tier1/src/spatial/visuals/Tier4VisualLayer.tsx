'use client'

import * as React from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

type Phase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'

export function Tier4VisualLayer({ phase }: { phase: Phase }) {
  const fieldA = React.useRef<THREE.Mesh | null>(null)
  const fieldB = React.useRef<THREE.Mesh | null>(null)

  const homeAura = useLoader(THREE.TextureLoader, '/assets/urai/home-aura.png')
  const lifemapAura = useLoader(THREE.TextureLoader, '/assets/urai/lifemap-aura.png')
  const focusAura = useLoader(THREE.TextureLoader, '/assets/urai/focus-aura.png')
  const replayAura = useLoader(THREE.TextureLoader, '/assets/urai/replay-chamber.png')

  const map =
    phase === 'HOME' || phase === 'ASCENT' ? homeAura :
    phase === 'LIFEMAP' ? lifemapAura :
    phase === 'FOCUS' ? focusAura :
    replayAura

  const positionA: [number, number, number] =
    phase === 'REPLAY' ? [-0.04, 0.02, -3.25] :
    phase === 'FOCUS' ? [0.03, -0.02, -3.5] :
    phase === 'LIFEMAP' ? [-0.08, 0.05, -6.2] :
    [0.03, -0.08, -6.2]

  const positionB: [number, number, number] =
    phase === 'REPLAY' ? [0.06, -0.03, -3.55] :
    phase === 'FOCUS' ? [-0.04, 0.03, -3.8] :
    phase === 'LIFEMAP' ? [0.1, -0.04, -6.45] :
    [-0.04, -0.04, -6.6]

  const scaleA: [number, number, number] =
    phase === 'REPLAY' ? [2.15, 2.15, 0.12] :
    phase === 'FOCUS' ? [1.55, 1.55, 0.1] :
    phase === 'LIFEMAP' ? [4.4, 3.4, 0.1] :
    [3.1, 1.9, 0.1]

  const scaleB: [number, number, number] =
    phase === 'REPLAY' ? [2.75, 2.25, 0.09] :
    phase === 'FOCUS' ? [2.0, 1.65, 0.08] :
    phase === 'LIFEMAP' ? [5.2, 3.8, 0.08] :
    [3.8, 2.15, 0.08]

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    for (const [mesh, offset] of [[fieldA.current, 0], [fieldB.current, 1.7]] as const) {
      if (!mesh) continue
      const material = mesh.material
      if (Array.isArray(material)) continue

      const base =
        phase === 'HOME' ? 0.012 :
        phase === 'ASCENT' ? 0.018 :
        phase === 'LIFEMAP' ? 0.026 :
        phase === 'FOCUS' ? 0.028 :
        0.022

      material.opacity = base + Math.sin(t * 0.22 + offset) * 0.004

      if (material instanceof THREE.MeshBasicMaterial) {
        const color =
          phase === 'HOME' ? new THREE.Color('#4977a8') :
          phase === 'ASCENT' ? new THREE.Color('#6c9ed0') :
          phase === 'LIFEMAP' ? new THREE.Color('#b8dcff') :
          phase === 'FOCUS' ? new THREE.Color('#ccefff') :
          new THREE.Color('#1b3158')

        material.color.lerp(color, 0.035)
      }

      mesh.rotation.z = Math.sin(t * 0.07 + offset) * 0.035
      mesh.rotation.x = Math.sin(t * 0.045 + offset) * 0.012
    }
  })

  return (
    <group name="tier4_visual_layer_deradialized_haze">
      <mesh ref={fieldB} position={positionB} scale={scaleB}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshBasicMaterial map={map} transparent opacity={0.018} depthWrite={false} side={THREE.FrontSide} />
      </mesh>

      <mesh ref={fieldA} position={positionA} scale={scaleA}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshBasicMaterial map={map} transparent opacity={0.026} depthWrite={false} side={THREE.FrontSide} />
      </mesh>
    </group>
  )
}

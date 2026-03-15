'use client'

import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { ReplayMemory } from '../data/replayMemoryData'

interface Props {
  memory: ReplayMemory
  position: THREE.Vector3
}

export default function MemoryProjection({ memory, position }: Props) {

  const groupRef = useRef<THREE.Group>(null!)
  const { camera } = useThree()

  const offset = useRef(new THREE.Vector3(0, 1.5, 0))
  const target = useRef(new THREE.Vector3())

  useFrame(() => {

    const group = groupRef.current
    if (!group) return

    target.current.copy(position).add(offset.current)

    group.position.lerp(target.current, 0.08)

    group.lookAt(camera.position)

  })

  return (

    <group ref={groupRef} frustumCulled={false}>

      <Html
        center
        transform
        distanceFactor={8}
        style={{
          pointerEvents: 'none'
        }}
      >

        <div
          style={{
            background: 'rgba(10,15,30,0.85)',
            border: '1px solid rgba(136,204,255,0.3)',
            padding: '16px 22px',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            color: '#ffffff',
            fontFamily: 'sans-serif',
            minWidth: '200px',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(136,204,255,0.25)'
          }}
        >

          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            {memory.type.toUpperCase()}
          </div>

          <div style={{ fontSize: '18px', marginTop: '6px' }}>
            {memory.title}
          </div>

          <div
            style={{
              marginTop: '10px',
              height: '4px',
              background: 'rgba(136,204,255,0.2)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}
          >

            <div
              style={{
                width: `${memory.emotionalWeight * 100}%`,
                height: '100%',
                background: '#88ccff'
              }}
            />

          </div>

        </div>

      </Html>

    </group>

  )

}
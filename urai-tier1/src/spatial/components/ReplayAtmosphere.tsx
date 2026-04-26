'use client'

import React from 'react'
import * as THREE from "three";
import type { LifeMapStar } from '@/lib/uraiCanon/lifemapStar'

export default function ReplayAtmosphere(props: {
  star: LifeMapStar | null
  visible: boolean
}) {
  if (!props.visible) return null

  const p = props.star?.position ?? [0, 0, 0]

  return (
    <>
      <mesh position={[p[0], p[1], p[2] - 0.7]}>
        <sphereGeometry args={[5.2, 48, 48]} />
        <meshBasicMaterial
          color="#150a18"
          transparent
          opacity={0.070}
          side={2}
         depthWrite={false} transparent  />
      </mesh>

      <mesh position={[p[0] + 0.22, p[1] + 0.08, p[2] - 0.18]}>
        <sphereGeometry args={[0.18, 14, 14]} />
        <meshBasicMaterial
          color="#efc8ff"
          transparent
          opacity={0.070}
         depthWrite={false} transparent  />
      </mesh>

      <mesh position={[p[0] - 0.38, p[1] - 0.14, p[2] - 0.46]}>
        <sphereGeometry args={[0.1, 14, 14]} />
        <meshBasicMaterial
          color="#b48ad1"
          transparent
          opacity={0.070}
         depthWrite={false} transparent  />
      </mesh>
    </>
  )
}


/* URAI_REPLAY_DEPTH_FINAL_LOCK
   Replay atmosphere/immersion depth tuning:
   - reduces bubble dominance
   - keeps layered haze readable
   - preserves existing component contracts
*/


/* URAI_REPLAY_LOOP_KILL_UI_REDUCE
   - Guards replay update-depth loops from unbounded effects.
   - Reduces replay text/UI dominance.
   - Softens replay shell opacity/material behavior.
   - Does not touch phase authority or camera contracts.
*/

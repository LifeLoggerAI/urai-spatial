'use client'

import * as THREE from 'three'
import { DESTINATIONS } from './GroundWorldModel'

const FLOOR_BAYS = Array.from({ length: 28 }, (_, index) => 8 - index * 1.45)
const RIB_BAYS = Array.from({ length: 13 }, (_, index) => 7.5 - index * 3.15)

export default function GroundContinuityArchitecture() {
  return (
    <group name="ground-continuity-architectural-shell" data-testid="urai-ground-continuity-shell">
      <fog attach="fog" args={['#020812', 9, 55]} />

      <mesh rotation
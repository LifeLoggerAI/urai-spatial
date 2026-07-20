'use client'

import { Html, Line, PerspectiveCamera, RoundedBox } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { stepEmbodiedMotion, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { DESTINATIONS, STATE_LABEL, type GroundDestination } from './GroundWorldModel'

export type GroundCheckpoint = { x: number; z: number; yaw: number; pitch: number; district?: string }

'use client'

import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneModeStore } from '../state/useSceneModeStore'
import { useReplayStore } from '../state/useReplayStore'
import { useReplayTimelineStore } from '../state/useReplayTimelineStore'
import { replayMemoryData } from '../data/replayMemoryData'
import MemoryBloom from './MemoryBloom'
import MemoryProjection from './MemoryProjection'

const ORB_POSITION = new THREE.Vector3(0, 3, 0)
const RING_RADIUS = 5.6
const HIT_THRESHOLD = 0.01
const DWELL_TIME = 2.5

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 6, 12)

export default function ReplayScene() {
  const mode = useSceneModeStore((s) => s.mode)
  const { selectedIndex, setSelection } = useReplayStore()
  const { progress, tick, setPlaying } = useReplayTimelineStore()

  const ringRef = useRef<THREE.Mesh>(null!)
  const cursorRef = useRef<THREE.Mesh>(null!)
  const dwellRef = useRef(0)

  const [scrubbing, setScrubbing] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  const { camera, mouse } = useThree()

  useFrame((_, delta) => {
    if (mode !== 'REPLAY') return
    if (!ringRef.current || !cursorRef.current) return

    const isolationActive = selectedIndex !== null

    // Timeline ticking
    if (!scrubbing && !isolationActive) {
      tick(delta)
    }

    const currentProgress = scrubbing
      ? getProgressFromMouse(mouse.x)
      : progress

    const angle = isolationActive
      ? replayMemoryData[selectedIndex!].timestamp * Math.PI * 2
      : currentProgress * Math.PI * 2

    const x = Math.cos(angle) * RING_RADIUS
    const z = Math.sin(angle) * RING_RADIUS

    cursorRef.current.position.set(
      ORB_POSITION.x + x,
      ORB_POSITION.y,
      ORB_POSITION.z + z
    )

    // Scrub preview
    if (scrubbing) {
      const nearest = findNearestMemory(currentProgress)
      setPreviewIndex(nearest)
    } else {
      setPreviewIndex(null)
    }

    // Auto isolate
    if (!scrubbing && !isolationActive) {
      replayMemoryData.forEach((memory, i) => {
        if (Math.abs(progress - memory.timestamp) < HIT_THRESHOLD) {
          setSelection(i, null)
          setPlaying(false)
          dwellRef.current = 0
        }
      })
    }

    // Auto resume
    if (isolationActive) {
      dwellRef.current += delta
      if (dwellRef.current >= DWELL_TIME) {
        setSelection(null, null)
        setPlaying(true)
        dwellRef.current = 0
      }
    }

    // 🎥 Cinematic Camera Logic
    if (isolationActive) {
      const target = getMemoryPosition(selectedIndex!)

      const desiredPos = target
        .clone()
        .add(new THREE.Vector3(3, 2, 4))

      camera.position.lerp(desiredPos, 0.05)
      // camera.lookAt(target)
    } else {
      camera.position.lerp(DEFAULT_CAMERA_POS, 0.04)
      // camera.lookAt(ORB_POSITION)
    }
  })

  return (
    <>
      <mesh
        ref={ringRef}
        position={ORB_POSITION}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={() => {
          setScrubbing(true)
          setPlaying(false)
        }}
        onPointerUp={() => {
          setScrubbing(false)
          setPlaying(true)
        }}
      >
        <ringGeometry args={[5.5, 5.7, 128]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#88ccff"
          emissiveIntensity={1}
          transparent
          opacity={0.5}
        />
      </mesh>

      <mesh ref={cursorRef}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#88ccff"
          emissiveIntensity={1}
        />
      </mesh>

      {replayMemoryData.map((memory, i) => {
        const pos = getMemoryPosition(i)
        const isPreview = previewIndex === i
        const isSelected = selectedIndex === i

        return (
          <mesh key={memory.id} position={pos}>
            <sphereGeometry args={[0.12 + memory.emotionalWeight * 0.1, 16, 16]} />
            <meshStandardMaterial
              color="#88ccff"
              emissive="#88ccff"
              emissiveIntensity={
                isSelected
                  ? 3.5
                  : isPreview
                  ? 2.5
                  : 0.8 + memory.emotionalWeight * 2
              }
              transparent
              opacity={isSelected ? 1 : 0.9}
            />
          </mesh>
        )
      })}

      {previewIndex !== null && selectedIndex === null && (
        <MemoryBloom center={getMemoryPosition(previewIndex)} active />
      )}

      {selectedIndex !== null && (
        <>
          <MemoryBloom center={getMemoryPosition(selectedIndex)} active />
          <MemoryProjection
            memory={replayMemoryData[selectedIndex]}
            position={getMemoryPosition(selectedIndex)}
          />
        </>
      )}
    </>
  )
}

function getMemoryPosition(index: number) {
  const memory = replayMemoryData[index]
  const angle = memory.timestamp * Math.PI * 2
  const x = Math.cos(angle) * RING_RADIUS
  const z = Math.sin(angle) * RING_RADIUS

  return new THREE.Vector3(
    ORB_POSITION.x + x,
    ORB_POSITION.y,
    ORB_POSITION.z + z
  )
}

function getProgressFromMouse(mouseX: number) {
  return (mouseX + 1) / 2
}

function findNearestMemory(progress: number) {
  let closest = 0
  let minDist = Infinity

  replayMemoryData.forEach((m, i) => {
    const d = Math.abs(m.timestamp - progress)
    if (d < minDist) {
      minDist = d
      closest = i
    }
  })

  return closest
}

"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import * as THREE from "three"

import CinematicCameraRig from "@/spatial/components/CinematicCameraRig"
import HomeEnvironment from "@/spatial/scene/HomeEnvironment"
import LifeMapStarfield, { type LifeMapStar } from "@/spatial/components/LifeMapStarfield"
import FocusSubject from "@/spatial/components/FocusSubject"
import ReplayScene from "@/spatial/components/ReplayScene"
import useSceneAuthority from "@/spatial/hooks/useSceneAuthority"
import useCanonEsc from "@/spatial/hooks/useCanonEsc"

const STARS: LifeMapStar[] = [
  { id: "star-1", title: "Threshold", position: [0.0, 1.15, -7.4], color: "#9fd3ff", size: 0.16, importance: 1.0 },
  { id: "star-2", title: "Signal", position: [-2.2, 1.85, -8.7], color: "#b8a6ff", size: 0.15, importance: 0.9 },
  { id: "star-3", title: "Memory", position: [2.3, 0.95, -9.5], color: "#7ce2ff", size: 0.15, importance: 0.88 },
  { id: "star-4", title: "Shift", position: [-3.1, 0.25, -10.8], color: "#ffd6a8", size: 0.14, importance: 0.82 },
  { id: "star-5", title: "Arc", position: [3.0, 2.20, -11.6], color: "#d9c2ff", size: 0.14, importance: 0.82 },
  { id: "star-6", title: "Bloom", position: [-0.8, 2.75, -12.6], color: "#8fdcff", size: 0.13, importance: 0.78 },
  { id: "star-7", title: "Return", position: [1.1, 3.35, -13.8], color: "#d9c8ff", size: 0.13, importance: 0.76 },
]

export default function SpatialScene() {
  const { phase, selectedStarId, actions } = useSceneAuthority()
  useCanonEsc(() => phase, actions)

  const [selectedStarPosition, setSelectedStarPosition] = useState<[number, number, number] | undefined>(undefined)
  const [focusReady, setFocusReady] = useState(false)
  const fogRef = useRef<THREE.Fog | null>(null)

  const isHome = phase === "HOME"
  const isAscent = phase === "ASCENT"
  const isLifeMap = phase === "LIFEMAP"
  const isFocus = phase === "FOCUS"
  const isReplay = phase === "REPLAY"

  const starfieldVisible = isLifeMap || isFocus || isReplay
  const replayPulse = isReplay ? 1.0 : 0.96

  const openFocus = useCallback((starId: string, position: [number, number, number]) => {
    setSelectedStarPosition(position)
    setFocusReady(true)
    actions.openFocus(starId)
  }, [actions])

  const enterReplay = useCallback(() => {
    if (!selectedStarId || !focusReady) return
    actions.openReplay(selectedStarId)
  }, [actions, focusReady, selectedStarId])

  useEffect(() => {
    if (!fogRef.current) return

    if (isHome) {
      fogRef.current.color = new THREE.Color("#0c1726")
      fogRef.current.near = 10
      fogRef.current.far = 52
      return
    }

    if (isAscent) {
      fogRef.current.color = new THREE.Color("#0f1d31")
      fogRef.current.near = 16
      fogRef.current.far = 95
      return
    }

    if (isLifeMap || isFocus) {
      fogRef.current.color = new THREE.Color("#08111d")
      fogRef.current.near = 36
      fogRef.current.far = 220
      return
    }

    if (isReplay) {
      fogRef.current.color = new THREE.Color("#05030b")
      fogRef.current.near = 0.6
      fogRef.current.far = 13
    }
  }, [isAscent, isFocus, isHome, isLifeMap, isReplay])

  useEffect(() => {
    if (!selectedStarId) {
      if (!isReplay && !isFocus) {
        setSelectedStarPosition(undefined)
      }
      return
    }
    const star = STARS.find((s) => s.id === selectedStarId)
    setSelectedStarPosition(star?.position)
  }, [isFocus, isReplay, selectedStarId])

  useEffect(() => {
    if (!isFocus) {
      setFocusReady(false)
    }
    if (isHome || isLifeMap) {
      setSelectedStarPosition(undefined)
    }
  }, [isFocus, isHome, isLifeMap])

  const selectedPosition = useMemo(() => {
    if (!selectedStarId) return undefined
    const star = STARS.find((s) => s.id === selectedStarId)
    return star?.position
  }, [selectedStarId])

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas
        camera={{ fov: 52, position: [0, 1.7, 7.5] }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={[isReplay ? "#04020a" : isLifeMap || isFocus ? "#020915" : "#020611"]} />
        <fog ref={fogRef} attach="fog" args={["#0c1726", 10, 52]} />

        <ambientLight intensity={isReplay ? 0.18 : isLifeMap || isFocus ? 0.34 : 0.55} />
        <pointLight position={[0, 4.5, 2.5]} intensity={isReplay ? 0.16 : 0.75} color="#a9c8ff" />
        <pointLight position={[0, -1.4, -5.0]} intensity={isReplay ? 0.22 : 1.15} distance={24} color="#9fd1ff" />
        {(isLifeMap || isFocus) && <pointLight position={[10, 12, 22]} intensity={0.28} distance={120} color="#8aa8ff" />}

        <CinematicCameraRig phase={phase} selected={selectedStarPosition ?? selectedPosition ?? null} />

        <HomeEnvironment
          visible={isHome || isAscent}
          interactive={isHome}
          onSkySelect={() => actions.beginAscent()}
          onGroundSelect={() => {}}
          onOrbSelect={() => {}}
          phase={phase}
          dim={isAscent ? 0.42 : 0}
        />

        <LifeMapStarfield
          visible={starfieldVisible && !isReplay}
          stars={STARS}
          selectedStarId={isFocus || isReplay ? selectedStarId : null}
          interactive={isLifeMap}
          onSelectStar={(id) => {
            const star = STARS.find((s) => s.id === id)
            if (!star) return
            openFocus(id, star.position)
          }}
          opacity={1}
        />

        {isFocus && selectedStarPosition && (
          <group position={selectedStarPosition}>
            <pointLight intensity={0.9} distance={18} color="#f2e7ff" />
            <FocusSubject visible={true} opacity={1} />
          </group>
        )}

        {isReplay && selectedStarPosition && (
          <group position={selectedStarPosition} scale={[replayPulse, replayPulse, replayPulse]}>
            <pointLight intensity={1.1} distance={16} color="#9d7bff" />
            <pointLight intensity={0.45} distance={8} color="#efe7ff" />
            <mesh>
              <sphereGeometry args={[2.2, 40, 40]} />
              <meshBasicMaterial color="#7f62ff" transparent opacity={0.08} depthWrite={false} />
            </mesh>
            <ReplayScene visible opacity={1} />
          </group>
        )}
      </Canvas>

      {isFocus && selectedStarPosition && focusReady && (
        <button
          onClick={enterReplay}
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            border: 0,
            borderRadius: 999,
            padding: "10px 14px",
            background: "rgba(7,13,24,0.72)",
            color: "#eef4ff",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          Enter Replay
        </button>
      )}
    </div>
  )
}

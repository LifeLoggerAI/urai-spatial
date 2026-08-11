"use client"

import { Canvas } from "@react-three/fiber"
import { ContactShadows, Environment, PerspectiveCamera, useGLTF } from "@react-three/drei"
import { Suspense, useMemo, useRef } from "react"
import * as THREE from "three"
import { demoShadowRealmEvent } from "@/lib/spatial/publicSafeSpatialData"
import { useSpatialQualityTier } from "@/spatial/performance/useSpatialQualityTier"
import { EmbodiedRealmCamera } from "@/spatial/navigation/EmbodiedRealmCamera"
import { MobileMovementPad, MovementHelp, useDragLook, useMovementInput } from "@/spatial/navigation/EmbodiedNavigation"
import { useReducedMotion } from "@/spatial/hooks/useReducedMotion"

const SHADOW_MODEL = "/assets/urai/generated/hero-realms-v2/shadow-hall-hero-v2.glb"

function ShadowHallModel() {
  const model = useGLTF(SHADOW_MODEL)
  const scene = useMemo(() => {
    const clone = model.scene.clone(true)
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      object.frustumCulled = true
    })
    return clone
  }, [model.scene])
  return <primitive object={scene} name="shadow-hall-hero-v2-model" />
}

export function ShadowRealmPortal() {
  const quality = useSpatialQualityTier()
  const reducedMotion = useReducedMotion()
  const shellRef = useRef<HTMLElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.035)
  const input = useMovementInput()
  const dragLook = useDragLook({ yaw, pitch, enabled: true, sensitivity: reducedMotion ? 0.0024 : 0.0038 })

  return (
    <main
      ref={shellRef}
      data-shadow-model-authority="urai-hero-realms-v2"
      data-spatial-quality-tier={quality.tier}
      data-spatial-shadow-map={quality.shadowMapSize}
      data-shadow-embodied="true"
      style={{
        position: "relative",
        minHeight: "100svh",
        overflow: "hidden",
        background: "#0b0b0d",
        color: "#eef2f4",
        fontFamily: "Inter,ui-sans-serif,system-ui",
      }}
      {...dragLook}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <Canvas shadows={quality.realtimeShadows} dpr={quality.dpr} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
          <Suspense fallback={null}>
            <color attach="background" args={["#17181a"]} />
            <fog attach="fog" args={["#1b1c1e", 8, 23]} />
            <PerspectiveCamera makeDefault position={[0, 1.68, 6.2]} fov={44} />
            <EmbodiedRealmCamera
              input={input}
              yaw={yaw}
              pitch={pitch}
              reducedMotion={reducedMotion}
              ownerRef={shellRef}
              datasetPrefix="shadow"
              spawn={[0, 6.2]}
              cameraHeight={1.68}
              speed={1.85}
              bounds={{ minX: -4.55, maxX: 4.55, minZ: -7.1, maxZ: 6.7 }}
              obstacles={[{ x: 0, z: -6.2, radius: 2.05 }]}
            />
            <ambientLight intensity={0.28} color="#bfc5c7" />
            <hemisphereLight intensity={0.48} color="#c6d0d4" groundColor="#272626" />
            <directionalLight
              position={[-4, 7, 4]}
              intensity={1.15}
              color="#d9d7cf"
              castShadow={quality.realtimeShadows}
              shadow-mapSize-width={quality.shadowMapSize}
              shadow-mapSize-height={quality.shadowMapSize}
            />
            <directionalLight position={[4, 3, -5]} intensity={0.32} color="#8e819e" />
            <ShadowHallModel />
            {quality.contactShadows ? <ContactShadows position={[0, 0.015, -1.3]} opacity={0.5} scale={12} blur={3} far={8} /> : null}
            <Environment preset="warehouse" environmentIntensity={Math.min(quality.environmentIntensity, 0.24)} />
          </Suspense>
        </Canvas>
      </div>

      <section
        data-movement-ui="true"
        style={{
          position: "absolute",
          zIndex: 10,
          left: "clamp(16px,4vw,48px)",
          bottom: "clamp(16px,4vw,44px)",
          width: "min(440px,calc(100vw - 32px))",
          border: "1px solid rgba(225,230,232,.14)",
          borderRadius: "1.35rem",
          padding: "1.1rem 1.2rem 1.2rem",
          background: "rgba(12,13,15,.66)",
          boxShadow: "0 22px 70px rgba(0,0,0,.34)",
          backdropFilter: "blur(14px)",
        }}
      >
        <p style={{ margin: 0, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(222,216,232,.66)", fontSize: ".68rem" }}>Shadow Realm · Private</p>
        <h1 style={{ margin: ".4rem 0 0", fontSize: "clamp(1.8rem,5vw,2.7rem)", lineHeight: 1.02 }}>{demoShadowRealmEvent.title}</h1>
        <p style={{ margin: ".65rem 0 0", color: "rgba(238,242,244,.72)", lineHeight: 1.55 }}>{demoShadowRealmEvent.summary}</p>
        <p style={{ margin: ".55rem 0 0", color: "rgba(238,242,244,.48)", fontSize: ".78rem" }}>Severity index: {Math.round(demoShadowRealmEvent.severity * 100)}% · Privacy: private-only</p>
        <a style={{ display: "inline-block", marginTop: ".8rem", color: "#e8f1f4", fontWeight: 750, textUnderlineOffset: 4 }} href="/spatial/life-map">Return to Life Map</a>
      </section>

      <MovementHelp realm="Shadow Realm" summary="Walk the physical hall while Shadow data remains private and governed." controls="WASD / arrow keys to move. Drag the hall to look. Mobile controls appear on touch devices." />
      <MobileMovementPad input={input} label="Move through Shadow Realm" />
    </main>
  )
}

useGLTF.preload(SHADOW_MODEL)

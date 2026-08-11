"use client"

import { Canvas } from "@react-three/fiber"
import { ContactShadows, Environment, PerspectiveCamera, useGLTF } from "@react-three/drei"
import { Suspense, useMemo } from "react"
import * as THREE from "three"
import { demoShadowRealmEvent } from "@/lib/spatial/publicSafeSpatialData"

const SHADOW_MODEL = "/assets/urai/generated/hero-realms-v2/shadow-hall-hero-v2.glb"

function ShadowHallModel() {
  const model = useGLTF(SHADOW_MODEL)
  const scene = useMemo(() => {
    const clone = model.scene.clone(true)
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
    })
    return clone
  }, [model.scene])
  return <primitive object={scene} name="shadow-hall-hero-v2-model" />
}

export function ShadowRealmPortal() {
  return (
    <main
      data-shadow-model-authority="urai-hero-realms-v2"
      style={{
        position: "relative",
        minHeight: "100svh",
        overflow: "hidden",
        background: "#0b0b0d",
        color: "#eef2f4",
        fontFamily: "Inter,ui-sans-serif,system-ui",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <Canvas shadows dpr={[1, 1.7]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
          <Suspense fallback={null}>
            <color attach="background" args={["#17181a"]} />
            <fog attach="fog" args={["#1b1c1e", 8, 23]} />
            <PerspectiveCamera makeDefault position={[0, 1.68, 7.3]} fov={43} />
            <ambientLight intensity={0.28} color="#bfc5c7" />
            <hemisphereLight intensity={0.48} color="#c6d0d4" groundColor="#272626" />
            <directionalLight position={[-4, 7, 4]} intensity={1.15} color="#d9d7cf" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
            <directionalLight position={[4, 3, -5]} intensity={0.32} color="#8e819e" />
            <ShadowHallModel />
            <ContactShadows position={[0, 0.015, -1.3]} opacity={0.5} scale={12} blur={3} far={8} />
            <Environment preset="warehouse" environmentIntensity={0.18} />
          </Suspense>
        </Canvas>
      </div>

      <section
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
    </main>
  )
}

useGLTF.preload(SHADOW_MODEL)

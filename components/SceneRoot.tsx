"use client"

import { Canvas } from "@react-three/fiber"
import { useState } from "react"
import HomeScene from "./home/HomeScene"
import SkyScene from "./sky/SkyScene"
import GroundScene from "./ground/GroundScene"
import ChatOverlay from "./chat/ChatOverlay"

export default function SceneRoot() {
  const [mode, setMode] = useState<"home" | "sky" | "ground" | "chat">("home")

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 3, 12], fov: 60 }}>
        <color attach="background" args={["black"]} />

        {mode === "home" && (
          <HomeScene
            openSky={() => setMode("sky")}
            openGround={() => setMode("ground")}
            openChat={() => setMode("chat")}
          />
        )}

        {mode === "sky" && <SkyScene goBack={() => setMode("home")} />}
        {mode === "ground" && <GroundScene goBack={() => setMode("home")} />}
      </Canvas>

      {mode === "chat" && <ChatOverlay close={() => setMode("home")} />}
    </div>
  )
}

"use client"

import { useSceneStore } from "../state/useSceneStore"
import HomeScene from "./HomeScene"
import ReplayScene from "./ReplayScene"

export default function MainScene() {
  const scene = useSceneStore((s) => s.scene)

  if (scene === "replay") {
    return <ReplayScene />
  }

  // default
  return <HomeScene />
}

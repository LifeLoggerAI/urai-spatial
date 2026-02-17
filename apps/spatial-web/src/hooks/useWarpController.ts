import { useState } from "react"

export type WarpState = "IDLE" | "FOCUSING" | "WARPING" | "REPLAY"

export function useWarpController() {
  const [warpState, setWarpState] = useState<WarpState>("IDLE")
  const [activeMemory, setActiveMemory] = useState<string | null>(null)

  const triggerWarp = (memoryId: string) => {
    if (warpState !== "IDLE") return

    setActiveMemory(memoryId)
    setWarpState("FOCUSING")

    // FOCUS phase
    setTimeout(() => {
      setWarpState("WARPING")
    }, 900)

    // WARP phase
    setTimeout(() => {
      setWarpState("REPLAY")
    }, 2200)
  }

  const resetWarp = () => {
    setWarpState("IDLE")
    setActiveMemory(null)
  }

  return {
    warpState,
    activeMemory,
    triggerWarp,
    resetWarp
  }
}

"use client"

import { useEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

const EMOTION_SOUNDS: Record<string, string> = {
  joy: "/audio/joy.mp3",
  love: "/audio/love.mp3",
  sadness: "/audio/sadness.mp3",
  anger: "/audio/anger.mp3",
  calm: "/audio/calm.mp3",
  curiosity: "/audio/curiosity.mp3",
  focus: "/audio/focus.mp3",
  default: "/audio/ambient.mp3",
}

export default function AudioField() {

  const { camera } = useThree()

  const { selectedStarId, stars } = useSpatialStore((s) => ({
    selectedStarId: s.selectedStarId,
    stars: s.stars,
  }))

  const listenerRef = useRef<THREE.AudioListener | null>(null)

  const activeAudio = useRef<THREE.Audio | null>(null)
  const nextAudio = useRef<THREE.Audio | null>(null)

  const loader = useMemo(() => new THREE.AudioLoader(), [])

  const bufferCache = useRef<Record<string, AudioBuffer>>({})

  const fade = useRef({
    active: false,
    t: 0,
    duration: 1.2,
  })

  useEffect(() => {

    const listener = new THREE.AudioListener()
    listenerRef.current = listener

    camera.add(listener)

    activeAudio.current = new THREE.Audio(listener)
    nextAudio.current = new THREE.Audio(listener)

    return () => {
      camera.remove(listener)
      listenerRef.current = null
    }

  }, [camera])

  useEffect(() => {

    const unlock = () => {

      const ctx = listenerRef.current?.context
      if (ctx && ctx.state === "suspended") {
        ctx.resume()
      }

      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("touchstart", unlock)

    }

    window.addEventListener("pointerdown", unlock)
    window.addEventListener("touchstart", unlock)

  }, [])

  const targetEmotion = useMemo(() => {

    if (selectedStarId !== null) {
      const star = stars?.find((s) => s.id === selectedStarId)
      return star?.emotion || "default"
    }

    return "default"

  }, [selectedStarId, stars])

  useEffect(() => {

    const path = EMOTION_SOUNDS[targetEmotion] || EMOTION_SOUNDS.default

    const play = (buffer: AudioBuffer) => {

      const a = activeAudio.current
      const b = nextAudio.current

      if (!a || !b) return

      b.setBuffer(buffer)
      b.setLoop(true)
      b.setVolume(0)
      b.play()

      fade.current.active = true
      fade.current.t = 0

    }

    if (bufferCache.current[path]) {
      play(bufferCache.current[path])
      return
    }

    loader.load(path, (buffer) => {

      bufferCache.current[path] = buffer
      play(buffer)

    })

  }, [targetEmotion, loader])

  useEffect(() => {

    let raf: number

    const tick = () => {

      const a = activeAudio.current
      const b = nextAudio.current

      if (fade.current.active && a && b) {

        fade.current.t += 0.016

        const k = Math.min(fade.current.t / fade.current.duration, 1)

        a.setVolume(0.35 * (1 - k))
        b.setVolume(0.35 * k)

        if (k >= 1) {

          a.stop()

          activeAudio.current = b
          nextAudio.current = a

          fade.current.active = false
        }
      }

      raf = requestAnimationFrame(tick)
    }

    tick()

    return () => cancelAnimationFrame(raf)

  }, [])

  return null
}
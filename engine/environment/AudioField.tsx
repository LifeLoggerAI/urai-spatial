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
  const audioRef = useRef<THREE.Audio | null>(null)
  const loader = useMemo(() => new THREE.AudioLoader(), [])

  const bufferCache = useRef<Record<string, AudioBuffer>>({})

  useEffect(() => {

    const listener = new THREE.AudioListener()
    listenerRef.current = listener

    camera.add(listener)

    audioRef.current = new THREE.Audio(listener)

    return () => {
      camera.remove(listener)
      listenerRef.current = null
    }

  }, [camera])

  const targetEmotion = useMemo(() => {

    if (selectedStarId !== null) {
      const star = stars.find((s) => s.id === selectedStarId)
      return star?.emotion || "default"
    }

    return "default"

  }, [selectedStarId, stars])

  useEffect(() => {

    const audio = audioRef.current
    if (!audio) return

    const path =
      EMOTION_SOUNDS[targetEmotion] || EMOTION_SOUNDS.default

    const playBuffer = (buffer: AudioBuffer) => {

      if (audio.isPlaying) audio.stop()

      audio.setBuffer(buffer)
      audio.setLoop(true)
      audio.setVolume(0.35)
      audio.play()

    }

    if (bufferCache.current[path]) {
      playBuffer(bufferCache.current[path])
      return
    }

    loader.load(path, (buffer) => {

      bufferCache.current[path] = buffer
      playBuffer(buffer)

    })

  }, [targetEmotion, loader])

  return null
}
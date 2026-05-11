'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { URAI_XR_SIGNALING_PROTOCOL, getUraiXrIceServers, type UraiXrFrameTelemetry, type UraiXrPoseSnapshot, type UraiXrSignalMessage, type UraiXrWorldSnapshot } from './uraiXrProductionRuntime'

export type UraiXrRoomClientState = {
  connected: boolean
  roomId: string
  peerId: string
  snapshot?: UraiXrWorldSnapshot
  iceServers: RTCIceServer[]
  navmeshUrl: string
}

export function useUraiXrRoom(input: { enabled: boolean; roomId: string; peerId: string; navmeshUrl?: string }) {
  const { enabled, roomId, peerId, navmeshUrl = '/xr/navmeshes/home-platform-v1.json' } = input
  const [snapshot, setSnapshot] = useState<UraiXrWorldSnapshot | undefined>()
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const iceServers = useMemo(() => getUraiXrIceServers() as RTCIceServer[], [])

  const postSignal = useCallback(async (message: UraiXrSignalMessage) => {
    const response = await fetch(URAI_XR_SIGNALING_PROTOCOL.path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(message),
    })
    const body = await response.json()
    if (body?.snapshot) setSnapshot(body.snapshot)
    return body
  }, [])

  const send = useCallback((message: UraiXrSignalMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return
    }
    postSignal(message).catch(() => undefined)
  }, [postSignal])

  const sendPresence = useCallback((pose: UraiXrPoseSnapshot) => {
    send({ type: 'presence', roomId, peerId, pose })
  }, [peerId, roomId, send])

  const sendTelemetry = useCallback((gpu: UraiXrFrameTelemetry) => {
    send({ type: 'telemetry', roomId, peerId, gpu })
  }, [peerId, roomId, send])

  const sendVoice = useCallback((position: [number, number, number], speaking: boolean, level: number) => {
    send({ type: 'voice', roomId, from: peerId, position, speaking, level })
  }, [peerId, roomId, send])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    postSignal({ type: 'join', roomId, peerId }).then((body) => {
      if (!cancelled) {
        setConnected(Boolean(body?.ok))
        if (body?.snapshot) setSnapshot(body.snapshot)
      }
    }).catch(() => setConnected(false))
    return () => {
      cancelled = true
      postSignal({ type: 'leave', roomId, peerId }).catch(() => undefined)
    }
  }, [enabled, peerId, postSignal, roomId])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}${URAI_XR_SIGNALING_PROTOCOL.websocketPath}?roomId=${encodeURIComponent(roomId)}&peerId=${encodeURIComponent(peerId)}`
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.onopen = () => {
        setConnected(true)
        ws.send(JSON.stringify({ type: 'join', roomId, peerId }))
      }
      ws.onmessage = (event) => {
        try {
          const body = JSON.parse(event.data)
          if (body?.snapshot) setSnapshot(body.snapshot)
        } catch {}
      }
      ws.onclose = () => setConnected(false)
      return () => ws.close()
    } catch {
      setConnected(false)
    }
  }, [enabled, peerId, roomId])

  return { connected, roomId, peerId, snapshot, iceServers, navmeshUrl, send, sendPresence, sendTelemetry, sendVoice } satisfies UraiXrRoomClientState & {
    send: (message: UraiXrSignalMessage) => void
    sendPresence: (pose: UraiXrPoseSnapshot) => void
    sendTelemetry: (gpu: UraiXrFrameTelemetry) => void
    sendVoice: (position: [number, number, number], speaking: boolean, level: number) => void
  }
}

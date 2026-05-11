'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { URAI_XR_SIGNALING_PROTOCOL, getUraiXrIceServers, type UraiXrFrameTelemetry, type UraiXrPoseSnapshot, type UraiXrSignalMessage, type UraiXrWorldSnapshot } from './uraiXrProductionRuntime'

export type UraiXrRoomClientState = {
  connected: boolean
  roomId: string
  peerId: string
  snapshot?: UraiXrWorldSnapshot
  peerSnapshot?: UraiXrWorldSnapshot
  iceServers: RTCIceServer[]
  navmeshUrl: string
  token?: string
}

export function useUraiXrRoom(input: { enabled: boolean; roomId: string; peerId: string; token?: string; navmeshUrl?: string }) {
  const { enabled, roomId, peerId, token, navmeshUrl = '/xr/navmeshes/home-platform-v1.json' } = input
  const [snapshot, setSnapshot] = useState<UraiXrWorldSnapshot | undefined>()
  const [peerSnapshot, setPeerSnapshot] = useState<UraiXrWorldSnapshot | undefined>()
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const iceServers = useMemo(() => getUraiXrIceServers() as RTCIceServer[], [])

  const hydrate = useCallback((body: { snapshot?: UraiXrWorldSnapshot; peerSnapshot?: UraiXrWorldSnapshot; ok?: boolean }) => {
    if (body?.snapshot) setSnapshot(body.snapshot)
    if (body?.peerSnapshot) setPeerSnapshot(body.peerSnapshot)
    if (typeof body?.ok === 'boolean') setConnected(body.ok)
  }, [])

  const withToken = useCallback((message: UraiXrSignalMessage): UraiXrSignalMessage => {
    if (!token || 'token' in message && message.token) return message
    return { ...message, token } as UraiXrSignalMessage
  }, [token])

  const postSignal = useCallback(async (message: UraiXrSignalMessage) => {
    const response = await fetch(URAI_XR_SIGNALING_PROTOCOL.path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(withToken(message)),
    })
    const body = await response.json()
    hydrate(body)
    return body
  }, [hydrate, withToken])

  const send = useCallback((message: UraiXrSignalMessage) => {
    const nextMessage = withToken(message)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(nextMessage))
      return
    }
    postSignal(nextMessage).catch(() => undefined)
  }, [postSignal, withToken])

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
      if (!cancelled) hydrate(body)
    }).catch(() => setConnected(false))
    return () => {
      cancelled = true
      postSignal({ type: 'leave', roomId, peerId }).catch(() => undefined)
    }
  }, [enabled, hydrate, peerId, postSignal, roomId])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const query = new URLSearchParams({ roomId, peerId })
    if (token) query.set('token', token)
    const wsUrl = `${protocol}//${window.location.host}${URAI_XR_SIGNALING_PROTOCOL.websocketPath}?${query.toString()}`
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.onopen = () => {
        setConnected(true)
        ws.send(JSON.stringify(withToken({ type: 'join', roomId, peerId })))
      }
      ws.onmessage = (event) => {
        try {
          hydrate(JSON.parse(event.data))
        } catch {}
      }
      ws.onclose = () => setConnected(false)
      return () => ws.close()
    } catch {
      setConnected(false)
    }
  }, [enabled, hydrate, peerId, roomId, token, withToken])

  return { connected, roomId, peerId, snapshot, peerSnapshot, iceServers, navmeshUrl, token, send, sendPresence, sendTelemetry, sendVoice } satisfies UraiXrRoomClientState & {
    send: (message: UraiXrSignalMessage) => void
    sendPresence: (pose: UraiXrPoseSnapshot) => void
    sendTelemetry: (gpu: UraiXrFrameTelemetry) => void
    sendVoice: (position: [number, number, number], speaking: boolean, level: number) => void
  }
}

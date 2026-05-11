'use client'

import { getUraiXrIceServers, URAI_XR_SIGNALING_PROTOCOL, type UraiXrSignalMessage } from './uraiXrProductionRuntime'

export type UraiXrPeerRuntime = {
  peerId: string
  roomId: string
  connection: RTCPeerConnection
  dataChannel: RTCDataChannel
  localStream?: MediaStream
}

export async function createUraiXrPeerRuntime(input: {
  roomId: string
  peerId: string
  remotePeerId: string
  sendSignal: (message: UraiXrSignalMessage) => void
  enableVoice?: boolean
}) {
  const connection = new RTCPeerConnection({ iceServers: getUraiXrIceServers() as RTCIceServer[] })
  const dataChannel = connection.createDataChannel(URAI_XR_SIGNALING_PROTOCOL.rtc.dataChannel, { ordered: false, maxRetransmits: 1 })
  let localStream: MediaStream | undefined

  if (input.enableVoice && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
    for (const track of localStream.getAudioTracks()) connection.addTrack(track, localStream)
  }

  connection.onicecandidate = (event) => {
    if (!event.candidate) return
    input.sendSignal({
      type: 'ice',
      roomId: input.roomId,
      from: input.peerId,
      to: input.remotePeerId,
      candidate: JSON.stringify(event.candidate),
    })
  }

  const offer = await connection.createOffer({ offerToReceiveAudio: Boolean(input.enableVoice) })
  await connection.setLocalDescription(offer)
  input.sendSignal({ type: 'offer', roomId: input.roomId, from: input.peerId, to: input.remotePeerId, sdp: offer.sdp ?? '' })

  return { peerId: input.peerId, roomId: input.roomId, connection, dataChannel, localStream } satisfies UraiXrPeerRuntime
}

export async function applyUraiXrPeerSignal(runtime: UraiXrPeerRuntime, message: UraiXrSignalMessage, sendSignal: (message: UraiXrSignalMessage) => void) {
  if (message.type === 'offer') {
    await runtime.connection.setRemoteDescription({ type: 'offer', sdp: message.sdp })
    const answer = await runtime.connection.createAnswer()
    await runtime.connection.setLocalDescription(answer)
    sendSignal({ type: 'answer', roomId: message.roomId, from: message.to, to: message.from, sdp: answer.sdp ?? '' })
  }

  if (message.type === 'answer') {
    await runtime.connection.setRemoteDescription({ type: 'answer', sdp: message.sdp })
  }

  if (message.type === 'ice') {
    await runtime.connection.addIceCandidate(JSON.parse(message.candidate))
  }
}

export function sampleUraiXrFrameTelemetry(input: { device?: 'quest-2' | 'quest-3' | 'quest-pro' | 'desktop-webxr' | 'unknown'; previousTime?: number; now?: number; dpr?: number }) {
  const now = input.now ?? performance.now()
  const frameMs = input.previousTime ? Math.max(0, now - input.previousTime) : 13.88
  const fps = frameMs > 0 ? Math.round(1000 / frameMs) : 72
  return {
    frameMs,
    fps,
    droppedFrames: fps < 68 ? 1 : 0,
    dpr: input.dpr ?? Math.min(window.devicePixelRatio || 1, 1.25),
    device: input.device ?? 'unknown',
    sampledAt: Date.now(),
  }
}

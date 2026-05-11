import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'
import { createMemoryPersistence } from '../../src/spatial/xr/uraiXrPersistence.ts'
import { createUraiXrRoomRuntime } from '../../src/spatial/xr/uraiXrRoomRuntime.ts'

const port = Number(process.env.URAI_XR_WS_PORT ?? 8787)
const socketsByRoom = new Map()
const runtime = createUraiXrRoomRuntime({
  persistence: createMemoryPersistence(),
  requireToken: process.env.URAI_XR_REQUIRE_SIGNED_ROOM_TOKEN === 'true',
})

function peersFor(roomId) {
  if (!socketsByRoom.has(roomId)) socketsByRoom.set(roomId, new Set())
  return socketsByRoom.get(roomId)
}

function broadcast(roomId, payload) {
  const peers = peersFor(roomId)
  for (const peer of peers) {
    if (peer.readyState === peer.OPEN) peer.send(JSON.stringify(payload))
  }
}

const server = createServer((request, response) => {
  if (request.url === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ ok: true, service: 'urai-xr-ws', rooms: socketsByRoom.size }))
    return
  }
  response.writeHead(404)
  response.end()
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (url.pathname !== '/api/xr/ws') {
    socket.destroy()
    return
  }
  wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request, url))
})

wss.on('connection', async (ws, _request, url) => {
  const roomId = url.searchParams.get('roomId') ?? 'home'
  const peerId = url.searchParams.get('peerId') ?? randomUUID()
  const token = url.searchParams.get('token') ?? undefined
  const peers = peersFor(roomId)
  peers.add(ws)
  ws.roomId = roomId
  ws.peerId = peerId

  const joined = await runtime.handle({ type: 'join', roomId, peerId, token })
  ws.send(JSON.stringify({ ...joined, type: joined.ok ? 'joined' : 'rejected', roomId, peerId }))
  if (!joined.ok) {
    ws.close(1008, joined.error ?? 'unauthorized')
    return
  }
  broadcast(roomId, { ...joined, type: 'room.snapshot' })

  ws.on('message', async (buffer) => {
    let message
    try {
      message = JSON.parse(buffer.toString())
    } catch {
      ws.send(JSON.stringify({ ok: false, roomId, peerId, error: 'malformed_json' }))
      return
    }

    const result = await runtime.handle({ ...message, roomId: message.roomId ?? roomId, token: message.token ?? token })
    if (!result.ok) {
      ws.send(JSON.stringify({ ...result, type: 'rejected' }))
      if (result.error === 'expired' || result.error === 'bad_signature' || result.error === 'malformed') ws.close(1008, result.error)
      return
    }
    broadcast(result.roomId, { ...result, type: 'room.snapshot', relay: message })
  })

  ws.on('close', async () => {
    peers.delete(ws)
    await runtime.handle({ type: 'leave', roomId, peerId, token }).catch(() => undefined)
    if (peers.size === 0) socketsByRoom.delete(roomId)
  })
})

server.listen(port, () => {
  console.log(`[urai-xr-ws] listening on :${port}`)
})

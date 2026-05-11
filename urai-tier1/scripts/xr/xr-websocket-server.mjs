import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'

const port = Number(process.env.URAI_XR_WS_PORT ?? 8787)
const rooms = new Map()

function peersFor(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set())
  return rooms.get(roomId)
}

const server = createServer((request, response) => {
  if (request.url === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ ok: true, service: 'urai-xr-ws', rooms: rooms.size }))
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

wss.on('connection', (ws, _request, url) => {
  const roomId = url.searchParams.get('roomId') ?? 'home'
  const peerId = url.searchParams.get('peerId') ?? crypto.randomUUID()
  const peers = peersFor(roomId)
  peers.add(ws)
  ws.roomId = roomId
  ws.peerId = peerId

  ws.send(JSON.stringify({ ok: true, type: 'joined', roomId, peerId }))

  ws.on('message', (buffer) => {
    let message
    try {
      message = JSON.parse(buffer.toString())
    } catch {
      return
    }
    for (const peer of peers) {
      if (peer.readyState === peer.OPEN) peer.send(JSON.stringify({ ok: true, roomId, relay: message }))
    }
  })

  ws.on('close', () => {
    peers.delete(ws)
    if (peers.size === 0) rooms.delete(roomId)
  })
})

server.listen(port, () => {
  console.log(`[urai-xr-ws] listening on :${port}`)
})

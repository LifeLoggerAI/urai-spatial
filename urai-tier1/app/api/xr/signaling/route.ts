import { NextRequest } from 'next/server'
import { createEmptyWorldSnapshot, reduceWorldSnapshot, type UraiXrSignalMessage } from '../../../../src/spatial/xr/uraiXrProductionRuntime'

const roomSnapshots = new Map<string, ReturnType<typeof createEmptyWorldSnapshot>>()

function getSnapshot(roomId: string) {
  const existing = roomSnapshots.get(roomId)
  if (existing) return existing
  const snapshot = createEmptyWorldSnapshot(roomId)
  roomSnapshots.set(roomId, snapshot)
  return snapshot
}

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get('roomId') ?? 'default'
  return Response.json({ ok: true, roomId, snapshot: getSnapshot(roomId) })
}

export async function POST(request: NextRequest) {
  const message = (await request.json()) as UraiXrSignalMessage
  const roomId = 'roomId' in message ? message.roomId : 'default'
  const current = getSnapshot(roomId)
  const next = reduceWorldSnapshot(current, message)
  roomSnapshots.set(roomId, next)

  return Response.json({ ok: true, roomId, snapshot: next, relay: message })
}

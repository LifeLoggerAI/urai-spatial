import { NextRequest } from 'next/server'
import { type UraiXrSignalMessage } from '@/spatial/xr/uraiXrProductionRuntime'
import { createMemoryPersistence } from '@/spatial/xr/uraiXrPersistence'
import { createUraiXrRoomRuntime } from '@/spatial/xr/uraiXrRoomRuntime'

export const dynamic = 'force-static'
export const revalidate = false

const runtime = createUraiXrRoomRuntime({
  persistence: createMemoryPersistence(),
  requireToken: process.env.URAI_XR_REQUIRE_SIGNED_ROOM_TOKEN === 'true',
})

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get('roomId') ?? 'default'
  const peerId = request.nextUrl.searchParams.get('peerId') ?? 'observer'
  const token = request.nextUrl.searchParams.get('token') ?? undefined
  const result = await runtime.observe(roomId, peerId, token)
  return Response.json(result, { status: result.ok ? 200 : 401 })
}

export async function POST(request: NextRequest) {
  const message = (await request.json()) as UraiXrSignalMessage
  const result = await runtime.handle(message)
  return Response.json({ ...result, relay: message }, { status: result.ok ? 200 : 401 })
}

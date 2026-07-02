export const dynamic = 'force-static'
export const revalidate = false

const staticPayload = {
  ok: true,
  route: '/api/xr/signaling',
  mode: 'static-export-safe',
  hosting: 'firebase-static',
  livePreview: true,
  serverRelayAvailable: false,
  note:
    'URAI public preview is running as a static Firebase export. Real XR room signaling requires a server/functions runtime and is intentionally not faked in static hosting.',
}

export async function GET() {
  return Response.json(staticPayload, {
    status: 200,
    headers: {
      'cache-control': 'public, max-age=300',
    },
  })
}

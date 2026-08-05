export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return Response.json(
    {
      error: 'PROVIDER_FUNCTION_REQUIRED',
      message: 'External voice processing is available only through the authenticated Firebase provider function.',
    },
    {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    },
  )
}

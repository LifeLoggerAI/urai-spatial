import { notFound } from 'next/navigation'
import CapturedRealityRouteClient from './CapturedRealityRouteClient'
import { capturedRealityReleaseEnabled } from '@/spatial/captured-reality/capturedReality'

export const dynamic = 'force-dynamic'

type RouteParams = { assetId: string }
type RouteSearchParams = { proof?: string | string[] }

function validAssetId(value: string) {
  return /^[A-Za-z0-9._-]{1,128}$/.test(value)
}

export default async function CapturedRealityRoutePage({
  params,
  searchParams,
}: {
  params: RouteParams | Promise<RouteParams>
  searchParams?: RouteSearchParams | Promise<RouteSearchParams>
}) {
  if (!capturedRealityReleaseEnabled()) notFound()

  const resolved = await Promise.resolve(params)
  if (!resolved?.assetId || !validAssetId(resolved.assetId)) notFound()

  const query = await Promise.resolve(searchParams ?? {})
  const proofValue = Array.isArray(query.proof) ? query.proof[0] : query.proof
  const proofMode = proofValue === '1'
  if (proofMode && process.env.URAI_ENABLE_CAPTURED_REALITY_PROOF !== 'true') notFound()

  return <CapturedRealityRouteClient assetId={resolved.assetId} accessMode={proofMode ? 'proof' : 'runtime'} />
}

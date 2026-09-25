import { notFound } from 'next/navigation'
import CapturedRealityRouteClient from './CapturedRealityRouteClient'
import { capturedRealityReleaseEnabled } from '@/spatial/captured-reality/capturedReality'

export const dynamic = 'force-dynamic'

type RouteParams = { assetId: string }

function validAssetId(value: string) {
  return /^[A-Za-z0-9._-]{1,128}$/.test(value)
}

export default async function CapturedRealityRoutePage({
  params,
}: {
  params: RouteParams | Promise<RouteParams>
}) {
  if (!capturedRealityReleaseEnabled()) notFound()

  const resolved = await Promise.resolve(params)
  if (!resolved?.assetId || !validAssetId(resolved.assetId)) notFound()

  return <CapturedRealityRouteClient assetId={resolved.assetId} />
}

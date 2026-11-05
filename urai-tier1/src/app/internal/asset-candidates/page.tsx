import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import manifest from '../../../../../operations/assets/launch-critical-assets.json'
import receipts from '../../../../../operations/assets/generated-receipts/urai-final-glb-pack-v1.json'
import CandidateReview, { type ReviewAsset } from './CandidateReview'

export const metadata: Metadata = {
  title: 'URAI INTERNAL — unadmitted model inspection',
  robots: { index: false, follow: false, nocache: true },
}

export default function CandidateReviewPage() {
  // Production must return 404 even if either preview flag was incorrectly set.
  if (process.env.NODE_ENV !== 'development' ||
      process.env.URAI_INTERNAL_CANDIDATE_REVIEW !== 'true' ||
      process.env.NEXT_PUBLIC_URAI_PREVIEW_MODE !== 'true') notFound()
  if (manifest.releasePolicy.candidateAssetsMayShip !== false) throw new Error('Candidate shipping gate must remain closed')
  const assets: ReviewAsset[] = manifest.assets.flatMap((asset) => {
    if (asset.kind !== 'model' || !asset.fixedPath.startsWith('urai-tier1/public/assets/urai/generated/models/')) return []
    const receipt = receipts.assets.find((item) => asset.fixedPath.endsWith('/' + item.fileName))
    if (!receipt) return []
    if (asset.releaseState !== 'pending-final-review') throw new Error('Unreviewed asset has incompatible release state')
    return [{
      id: asset.id, url: asset.fixedPath.slice('urai-tier1/public'.length),
      label: asset.id.replaceAll('-', ' '), bytes: receipt.bytes, sha256: receipt.sha256,
      recordedTriangles: receipt.triangleCount, source: asset.source, license: asset.license,
      releaseState: asset.releaseState,
    }]
  })
  if (assets.length !== 8) throw new Error('Expected eight immutable source-controlled model candidates')
  return <CandidateReview assets={assets} />
}

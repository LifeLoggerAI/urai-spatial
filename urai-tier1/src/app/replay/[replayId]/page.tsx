import Link from 'next/link'
import { redirect } from 'next/navigation'

import { resolveDemoReplay, type MemoryStarResolution } from '@/spatial/memory/memoryStarSchema'
import { DEMO_MEMORY_STAR_NODES } from '@/spatial/memory/memoryStarSchema'

type ReplayDirectRouteProps = {
  params: Promise<{ replayId: string }>
}

type UnavailableMemoryStarResolution = Extract<MemoryStarResolution, { ok: false }>

function isUnavailableMemoryStarResolution(resolution: MemoryStarResolution): resolution is UnavailableMemoryStarResolution {
  return resolution.ok === false
}

function UnavailableReplay({ resolution }: { resolution: UnavailableMemoryStarResolution }) {
  return (
    <main data-testid="urai-replay-direct-route" data-status={resolution.status} data-reason={resolution.reason}>
      <h1>Replay unavailable</h1>
      <p>This replay is unavailable, private, locked, deleted, or not part of the launch-safe demo set.</p>
      <Link href={resolution.safeHref}>Return to Life Map</Link>
    </main>
  )
}

export function generateStaticParams() {
  return DEMO_MEMORY_STAR_NODES.map((star) => ({
    replayId: star.id,
  }))
}

export default async function ReplayDirectRoute({ params }: ReplayDirectRouteProps) {
  const { replayId } = await params
  const resolution = resolveDemoReplay(replayId)

  if (isUnavailableMemoryStarResolution(resolution)) {
    return <UnavailableReplay resolution={resolution} />
  }

  redirect(resolution.star.replayHref)
}

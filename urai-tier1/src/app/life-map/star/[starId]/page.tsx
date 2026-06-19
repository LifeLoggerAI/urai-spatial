import Link from 'next/link'
import { redirect } from 'next/navigation'

import { DEMO_MEMORY_STAR_NODES, resolveDemoMemoryStar, type MemoryStarResolution } from '@/spatial/memory/memoryStarSchema'


export function generateStaticParams() {
  return DEMO_MEMORY_STAR_NODES.map((star) => ({
    starId: star.id,
  }))
}

type MemoryStarRouteProps = {
  params: Promise<{ starId: string }>
}

type UnavailableMemoryStarResolution = Extract<MemoryStarResolution, { ok: false }>

function isUnavailableMemoryStarResolution(resolution: MemoryStarResolution): resolution is UnavailableMemoryStarResolution {
  return resolution.ok === false
}

function UnavailableMemoryStar({ resolution }: { resolution: UnavailableMemoryStarResolution }) {
  return (
    <main data-testid="urai-memory-star-direct-route" data-status={resolution.status} data-reason={resolution.reason}>
      <h1>Memory star unavailable</h1>
      <p>This memory star is unavailable, private, locked, deleted, or not part of the launch-safe demo set.</p>
      <Link href={resolution.safeHref}>Return to Life Map</Link>
    </main>
  )
}

export default async function MemoryStarRoute({ params }: MemoryStarRouteProps) {
  const { starId } = await params
  const resolution = resolveDemoMemoryStar(starId)

  if (isUnavailableMemoryStarResolution(resolution)) {
    return <UnavailableMemoryStar resolution={resolution} />
  }

  redirect(resolution.star.focusHref)
}

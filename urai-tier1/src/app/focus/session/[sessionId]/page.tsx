import { redirect } from 'next/navigation'
import Link from 'next/link'

import { DEMO_MEMORY_STAR_NODES, resolveDemoMemoryStar, type MemoryStarResolution } from '@/spatial/memory/memoryStarSchema'


export function generateStaticParams() {
  return DEMO_MEMORY_STAR_NODES.map((star) => ({
    sessionId: star.id,
  }))
}

type FocusSessionRouteProps = {
  params: Promise<{ sessionId: string }>
}

type UnavailableMemoryStarResolution = Extract<MemoryStarResolution, { ok: false }>

function isUnavailableMemoryStarResolution(resolution: MemoryStarResolution): resolution is UnavailableMemoryStarResolution {
  return resolution.ok === false
}

function UnavailableFocusSession({ resolution }: { resolution: UnavailableMemoryStarResolution }) {
  return (
    <main data-testid="urai-focus-session-direct-route" data-status={resolution.status} data-reason={resolution.reason}>
      <h1>Focus session unavailable</h1>
      <p>This focus session is unavailable, private, locked, deleted, or not part of the launch-safe demo set.</p>
      <Link href={resolution.safeHref}>Return to Life Map</Link>
    </main>
  )
}

export default async function FocusSessionRoute({ params }: FocusSessionRouteProps) {
  const { sessionId } = await params
  const resolution = resolveDemoMemoryStar(sessionId)

  if (isUnavailableMemoryStarResolution(resolution)) {
    return <UnavailableFocusSession resolution={resolution} />
  }

  redirect(resolution.star.focusHref)
}

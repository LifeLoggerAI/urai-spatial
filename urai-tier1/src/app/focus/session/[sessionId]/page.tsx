import { redirect } from 'next/navigation'
import { FocusSessionUnavailable } from '../FocusSessionUnavailable'

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
      <FocusSessionUnavailable safeHref={resolution.safeHref} />
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


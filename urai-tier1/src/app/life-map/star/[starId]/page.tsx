import Link from 'next/link'
import { redirect } from 'next/navigation'

import { resolveDemoMemoryStar } from '@/spatial/memory/memoryStarSchema'

type MemoryStarRouteProps = {
  params: Promise<{ starId: string }>
}

export default async function MemoryStarRoute({ params }: MemoryStarRouteProps) {
  const { starId } = await params
  const resolution = resolveDemoMemoryStar(starId)

  if (!resolution.ok) {
    return (
      <main data-testid="urai-memory-star-direct-route" data-status={resolution.status} data-reason={resolution.reason}>
        <h1>Memory star unavailable</h1>
        <p>This memory star is unavailable, private, locked, deleted, or not part of the launch-safe demo set.</p>
        <Link href={resolution.safeHref}>Return to Life Map</Link>
      </main>
    )
  }

  redirect(resolution.star.focusHref)
}

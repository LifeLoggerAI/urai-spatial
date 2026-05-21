import { redirect } from 'next/navigation'
import Link from 'next/link'

import { resolveDemoMemoryStar } from '@/spatial/memory/memoryStarSchema'

type FocusSessionRouteProps = {
  params: Promise<{ sessionId: string }>
}

export default async function FocusSessionRoute({ params }: FocusSessionRouteProps) {
  const { sessionId } = await params
  const resolution = resolveDemoMemoryStar(sessionId)

  if (resolution.ok) {
    redirect(resolution.star.focusHref)
  }

  return (
    <main data-testid="urai-focus-session-direct-route" data-status={resolution.status} data-reason={resolution.reason}>
      <h1>Focus session unavailable</h1>
      <p>This focus session is unavailable, private, locked, deleted, or not part of the launch-safe demo set.</p>
      <Link href={resolution.safeHref}>Return to Life Map</Link>
    </main>
  )
}

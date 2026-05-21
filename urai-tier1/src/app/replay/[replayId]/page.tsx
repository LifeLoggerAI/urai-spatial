import Link from 'next/link'
import { redirect } from 'next/navigation'

import { resolveDemoReplay } from '@/spatial/memory/memoryStarSchema'

type ReplayDirectRouteProps = {
  params: Promise<{ replayId: string }>
}

export default async function ReplayDirectRoute({ params }: ReplayDirectRouteProps) {
  const { replayId } = await params
  const resolution = resolveDemoReplay(replayId)

  if (resolution.ok) {
    redirect(resolution.star.replayHref)
  }

  return (
    <main data-testid="urai-replay-direct-route" data-status={resolution.status} data-reason={resolution.reason}>
      <h1>Replay unavailable</h1>
      <p>This replay is unavailable, private, locked, deleted, or not part of the launch-safe demo set.</p>
      <Link href={resolution.safeHref}>Return to Life Map</Link>
    </main>
  )
}

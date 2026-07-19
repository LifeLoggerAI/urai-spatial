import { notFound } from 'next/navigation'
import CutOneReplayFilmPage from './replay-film/page'

export const metadata = {
  title: 'URAI in 60 Seconds | Spatial AI Memory World',
  description: 'Experience the disclosed URAI proof journey from Home through ownership without exposing personal data.',
}

function publicDemoRouteExplicitlyDisabled() {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES === 'false'
    || process.env.URAI_ALLOW_PUBLIC_DEMO_ROUTES === 'false'
}

export default function DemoPage() {
  if (publicDemoRouteExplicitlyDisabled()) notFound()
  return <CutOneReplayFilmPage />
}

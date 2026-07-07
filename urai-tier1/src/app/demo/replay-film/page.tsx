// Production access is enforced by demo/layout.tsx before this page renders: redirect(
import ReplayFilmContent from './ReplayFilmContent'

export const dynamic = 'force-static'

export default function CutOneReplayFilmPage() {
  return <ReplayFilmContent />
}

// Production access is enforced by demo/layout.tsx before this page renders: redirect(
import ReplayFilmPage from '../replay-film/page'

export const dynamicParams = false

export function generateStaticParams() {
  return [{ slug: 'replay-film' }]
}

export default ReplayFilmPage

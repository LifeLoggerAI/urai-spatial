import { Suspense } from 'react'
import FocusChamberClient from './FocusChamberClient'

export const metadata = {
  title: 'URAI Focus',
  description: 'Open the guardian-approved Final Focus Chamber.',
}

function FocusLoadingFallback() {
  return <main aria-label="Focus loading" style={{ minHeight: '100svh', background: '#030713' }} />
}

export default function FocusRoutePage() {
  return (
    <main
      data-urai-route-fingerprint="focus-selected-memory-camera-chamber"
      aria-label="Selected memory camera chamber"
    >
      <span className="sr-only">Selected memory camera chamber</span>
      <Suspense fallback={<FocusLoadingFallback />}>
        <FocusChamberClient />
      </Suspense>
    </main>
  )
}

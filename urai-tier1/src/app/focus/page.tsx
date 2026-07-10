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
    <Suspense fallback={<FocusLoadingFallback />}>
      <FocusChamberClient />
    </Suspense>
  )
}

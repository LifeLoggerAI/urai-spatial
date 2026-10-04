import { Suspense } from 'react'
import PossibleFuturesClient from './PossibleFuturesClient'

export default function PossibleFuturesPage() {
  return (
    <Suspense fallback={<main aria-busy="true" aria-label="Loading Possible Futures" />}>
      <PossibleFuturesClient />
    </Suspense>
  )
}

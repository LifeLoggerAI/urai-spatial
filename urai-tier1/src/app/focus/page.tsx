import { Suspense } from 'react'
import FinalFocusChamber from './FocusChamberClient'
import './focus-stable-controls.css'

export const metadata = {
  title: 'URAI Focus',
  description: 'Enter the private stellar focus held around a selected Life Map memory star.',
}

export default function FocusRoutePage() {
  return (
    <Suspense fallback={
      <main aria-labelledby="focus-entry-heading" className="grid place-items-center overflow-y-auto">
        <section className="max-w-xl p-6">
          <h1 id="focus-entry-heading" className="font-serif text-4xl">Focus Memory Star</h1>
          <p className="my-3">Choose a star in Life Map to enter the stellar memory field where that memory is held.</p>
          <a href="/life-map" className="inline-flex min-h-12 items-center rounded-sm px-2 underline focus-visible:outline-2 focus-visible:outline-offset-4">
            Open Life Map
          </a>
        </section>
      </main>
    }>
      <FinalFocusChamber />
    </Suspense>
  )
}

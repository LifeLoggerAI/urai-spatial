import { Suspense } from 'react'
import FinalFocusChamber from './FocusChamberClient'
import './focus-stable-controls.css'

export const metadata = {
  title: 'URAI Focus',
  description: 'Enter the private stellar focus held around a selected Life Map memory star.',
}

export default function FocusRoutePage() {
  return <Suspense fallback={<main role="status" style={{minHeight:'100svh',display:'grid',placeItems:'center'}}>Opening Focus…</main>}><FinalFocusChamber /></Suspense>
}

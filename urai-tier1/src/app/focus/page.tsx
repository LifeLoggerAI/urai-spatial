import FinalFocusChamber from './FocusChamberClient'
import './focus-stable-controls.css'
import { publicIndexing } from '../public-indexing'

export const metadata = {
  robots: publicIndexing,
  alternates: { canonical: 'https://urai.app/focus/' },
  openGraph: { url: 'https://urai.app/focus/' },
  title: 'URAI Focus',
  description: 'Enter the private spatial chamber held around a selected Life Map memory star.',
}

export default function FocusRoutePage() {
  return <FinalFocusChamber />
}

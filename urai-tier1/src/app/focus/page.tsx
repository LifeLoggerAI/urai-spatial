import FinalFocusChamber from './FocusChamberClient'
import './focus-stable-controls.css'
import { publicIndexing } from '../public-indexing'

const title = 'URAI Focus'
const description = 'Enter the private spatial chamber held around a selected Life Map memory star.'

export const metadata = {
  robots: publicIndexing,
  alternates: { canonical: 'https://urai.app/focus/' },
  openGraph: {
    url: 'https://urai.app/focus/',
    title,
    description,
    siteName: 'UrAi',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
  title,
  description,
}

export default function FocusRoutePage() {
  return <FinalFocusChamber />
}

import { FinalFocusChamber } from '@/app/FinalMemorySurfaces'

export const metadata = {
  title: 'URAI Focus',
  description: 'Open the guardian-approved Final Focus Chamber.',
}

export default function FocusRoutePage() {
  return (
    <main
      data-urai-route-fingerprint="focus-selected-memory-camera-chamber"
      aria-label="Selected memory camera chamber"
    >
      <span className="sr-only">Selected memory camera chamber</span>
      <FinalFocusChamber />
    </main>
  )
}

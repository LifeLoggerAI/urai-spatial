import { MemoryPreviewGrid } from '@/components/memory/MemoryPreviewGrid'

export const metadata = {
  title: 'URAI Memory Preview',
  description: 'Realistic memory cards showing how URAI connects people, places, timelines, and context.',
}

export default function MemoryPage() {
  return (
    <main className="container">
      <h1>Memory becomes context.</h1>
      <p>URAI represents personal memory as connected people, places, moments, and source-aware context.</p>
      <MemoryPreviewGrid />
    </main>
  )
}

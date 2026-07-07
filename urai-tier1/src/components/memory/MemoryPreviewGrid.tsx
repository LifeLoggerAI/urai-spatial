import { memoryPreviews } from '@/data/memories'
import { MemoryCard } from './MemoryCard'

export function MemoryPreviewGrid() {
  return (
    <section aria-label="Realistic memory previews">
      <h2>Real context, not fantasy.</h2>
      <p>URAI surfaces memories as people, places, timelines, and evidence-backed context.</p>
      {memoryPreviews.map((memory) => <MemoryCard key={memory.title} memory={memory} />)}
    </section>
  )
}

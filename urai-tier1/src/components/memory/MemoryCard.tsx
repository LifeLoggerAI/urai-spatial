import type { MemoryPreview } from '@/data/memories'

export function MemoryCard({ memory }: { memory: MemoryPreview }) {
  return (
    <article data-memory-card={memory.title}>
      <h2>{memory.title}</h2>
      <p>{memory.date}</p>
      <p>{memory.place}</p>
      <p>{memory.context}</p>
      <p>{memory.people.join(', ')}</p>
    </article>
  )
}

import { StatusBadge } from './StatusBadge'
import type { ReceiptSystem } from '@/data/receipts'

export function EvidenceCard({ system }: { system: ReceiptSystem }) {
  return (
    <article data-evidence-card={system.name}>
      <h2>{system.name}</h2>
      <StatusBadge state={system.state} />
      <p>{system.nextGate}</p>
    </article>
  )
}

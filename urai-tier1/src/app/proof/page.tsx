import { receiptSystems } from '@/data/receipts'
import { EvidenceCard } from '@/components/evidence/EvidenceCard'

export const metadata = {
  title: 'URAI Proof',
  description: 'Receipt-backed URAI system proof and next gates.',
}

export default function ProofPage() {
  return (
    <main className="container">
      <h1>Proof, not promises.</h1>
      <p>URAI separates built systems, verified systems, previews, and launch gates.</p>
      <section>
        {receiptSystems.map((system) => <EvidenceCard key={system.name} system={system} />)}
      </section>
    </main>
  )
}

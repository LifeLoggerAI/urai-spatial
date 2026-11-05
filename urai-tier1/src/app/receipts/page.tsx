import { receiptSystems } from '@/data/receipts'
import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'URAI Receipts | Public Evidence',
  description: 'Public evidence, system status, and launch readiness information for URAI.',
}

export default function ReceiptsPage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="UrAi · Verification"
      title="Built with receipts."
      lede="Review the evidence behind each part of UrAi and the next check it needs. Current availability is shown on Status."
      links={[{ href: '/status', label: 'Current release status', primary: true }, { href: '/proof', label: 'Explore the evidence' }]}
    >
      <section>
        {receiptSystems.map((system) => (
          <article key={system.name}>
            <h2>{system.name}</h2>
            <p>{system.state}</p>
            <p>{system.nextGate}</p>
          </article>
        ))}
      </section>
    </InstitutionalPublicSurface>
  )
}

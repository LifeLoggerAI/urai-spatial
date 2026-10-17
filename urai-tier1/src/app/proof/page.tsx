import { receiptSystems } from '@/data/receipts'
import { EvidenceCard } from '@/components/evidence/EvidenceCard'
import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'URAI Proof',
  description: 'Receipt-backed URAI system proof and next gates.',
}

export default function ProofPage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="UrAi · Evidence"
      title="Know what is ready."
      lede="See the distinction between available experiences, previews, and the checks still required before release."
      links={[{ href: '/status', label: 'Current release status', primary: true }, { href: '/home', label: 'Return Home' }]}
    >
      <section>
        {receiptSystems.map((system) => <EvidenceCard key={system.name} system={system} />)}
      </section>
    </InstitutionalPublicSurface>
  )
}

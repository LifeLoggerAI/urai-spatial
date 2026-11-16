import { MemoryPreviewGrid } from '@/components/memory/MemoryPreviewGrid'
import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'URAI Memory Preview',
  description: 'Realistic memory cards showing how URAI connects people, places, timelines, and context.',
}

export default function MemoryPage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="Memory · Examples"
      title="Memory becomes context."
      lede="Explore how people, places, and moments can connect. These examples illustrate the experience; they are not your private memories."
      links={[{ href: '/life-map', label: 'Open Life Map', primary: true }, { href: '/privacy-controls', label: 'Manage privacy' }]}
    >
      <MemoryPreviewGrid />
    </InstitutionalPublicSurface>
  )
}

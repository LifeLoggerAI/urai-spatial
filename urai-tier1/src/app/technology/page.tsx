import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'URAI Technology',
  description: 'Architecture layers behind the URAI spatial memory system.',
}

const layers = [
  { name: 'Experience Layer', detail: 'Home, Ground, Life Map, Replay, Mirror, Passport, and Status.' },
  { name: 'Context Layer', detail: 'Memory, timeline, people, places, and relationship context.' },
  { name: 'Intelligence Layer', detail: 'Guidance, context reading, and pattern discovery.' },
  { name: 'Trust Layer', detail: 'Consent, ownership, privacy, and provenance.' },
  { name: 'Evidence Layer', detail: 'Receipts, tests, route audits, and launch gates.' },
]

export default function TechnologyPage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="UrAi · Technology"
      title="The system behind UrAi."
      lede="Experience, context, intelligence, trust, and evidence work together to keep your memories useful and your choices clear."
      links={[{ href: '/home', label: 'Enter UrAi', primary: true }, { href: '/privacy-controls', label: 'Privacy & consent' }, { href: '/status', label: 'Current availability' }]}
    >
      <section>
        {layers.map((layer) => (
          <article key={layer.name}>
            <h2>{layer.name}</h2>
            <p>{layer.detail}</p>
          </article>
        ))}
      </section>
    </InstitutionalPublicSurface>
  )
}

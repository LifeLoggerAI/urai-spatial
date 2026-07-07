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
    <main className="container">
      <h1>The system behind URAI</h1>
      <p>URAI is built as connected layers: experience, context, intelligence, trust, and evidence.</p>
      <section>
        {layers.map((layer) => (
          <article key={layer.name}>
            <h2>{layer.name}</h2>
            <p>{layer.detail}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

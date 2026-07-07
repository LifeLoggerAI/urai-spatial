export const metadata = {
  title: 'URAI Receipts | Public Evidence',
  description: 'Public evidence, system status, and launch readiness information for URAI.',
}

const systems = [
  ['Spatial Runtime', 'Built', 'Architecture and runtime documentation'],
  ['Privacy Layer', 'Built', 'Consent and trust documentation'],
  ['Status Surface', 'In Progress', 'Receipt-backed public status'],
  ['XR Paths', 'Preview', 'Future device validation'],
]

export default function ReceiptsPage() {
  return (
    <main className="container">
      <h1>Built with receipts.</h1>
      <p>URAI tracks systems through evidence, documentation, and verification gates.</p>
      <section>
        {systems.map(([name, state, evidence]) => (
          <article key={name}>
            <h2>{name}</h2>
            <p>{state}</p>
            <p>{evidence}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

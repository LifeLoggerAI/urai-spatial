import { receiptSystems } from '@/data/receipts'

export const metadata = {
  title: 'URAI Receipts | Public Evidence',
  description: 'Public evidence, system status, and launch readiness information for URAI.',
}

export default function ReceiptsPage() {
  return (
    <main className="container">
      <h1>Built with receipts.</h1>
      <p>URAI tracks systems through evidence, documentation, and verification gates.</p>
      <section>
        {receiptSystems.map((system) => (
          <article key={system.name}>
            <h2>{system.name}</h2>
            <p>{system.state}</p>
            <p>{system.nextGate}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

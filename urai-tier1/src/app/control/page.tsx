import { notFound } from 'next/navigation'
import LiveControlPanel from "../../components/LiveControlPanel";
import LiveControlPanelStream from "../../components/LiveControlPanelStream";

function internalControlAllowed() {
  if (process.env.NODE_ENV !== 'production') return true
  return process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES === 'true' || process.env.URAI_ALLOW_INTERNAL_ROUTES === 'true'
}

export default function ControlPage() {
  if (!internalControlAllowed()) notFound()

  return (
    <main style={{ padding: 20 }}>
      <h1>URAI Live Control UI</h1>

      <section style={{ marginBottom: 40 }}>
        <h2>Manual Mode</h2>
        <LiveControlPanel />
      </section>

      <section>
        <h2>REAL-TIME STREAM MODE</h2>
        <LiveControlPanelStream />
      </section>
    </main>
  );
}
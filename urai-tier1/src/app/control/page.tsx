import LiveControlPanel from "../../components/LiveControlPanel";

export default function ControlPage() {
  return (
    <main style={{ padding: 20 }}>
      <h1>URAI Live Control UI</h1>
      <section>
        <h2>Manual Mode</h2>
        <LiveControlPanel />
      </section>
    </main>
  );
}

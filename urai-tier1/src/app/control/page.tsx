import LiveControlPanel from "../../components/LiveControlPanel";
import LiveControlPanelStream from "../../components/LiveControlPanelStream";

export default function ControlPage() {
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
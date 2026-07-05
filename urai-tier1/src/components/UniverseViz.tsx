"use client";

export default function UniverseViz({ state }: any) {
  if (!state) return <div>No universe state</div>;

  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Tick: {state.tick}
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>Nodes</strong>
        <ul>
          {(state.nodes || []).map((n: any) => (
            <li key={n.id}>
              {n.id} | load: {n.load?.toFixed?.(2) ?? 0}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>Events</strong>
        <div>{state.eventCount}</div>
      </div>
    </div>
  );
}

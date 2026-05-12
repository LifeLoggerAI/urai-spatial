import { demoShadowRealmEvent } from "@/lib/spatial/publicSafeSpatialData";

export function ShadowRealmPortal() {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem", background: "radial-gradient(circle at 50% 45%,rgba(70,85,120,.22),transparent 20rem),linear-gradient(180deg,#0b1228,#02040a)", color: "#e6f9ff", fontFamily: "Inter,ui-sans-serif,system-ui" }}>
      <section style={{ maxWidth: "42rem", border: "1px solid rgba(180,230,255,.14)", borderRadius: "1.4rem", padding: "1.4rem", background: "rgba(4,10,22,.72)" }}>
        <p style={{ letterSpacing: ".18em", textTransform: "uppercase", color: "#a8b7ff", fontSize: ".72rem" }}>Shadow Realm</p>
        <h1>{demoShadowRealmEvent.title}</h1>
        <p>{demoShadowRealmEvent.summary}</p>
        <p>Severity index: {Math.round(demoShadowRealmEvent.severity * 100)}% · Privacy: private-only</p>
        <a style={{ color: "#bfefff", fontWeight: 800 }} href="/spatial/life-map">Return to Life Map</a>
      </section>
    </main>
  );
}

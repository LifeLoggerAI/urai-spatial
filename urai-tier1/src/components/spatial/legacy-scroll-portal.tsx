import { demoLegacyScroll } from "@/lib/spatial/publicSafeSpatialData";

export function LegacyScrollPortal() {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem", background: "linear-gradient(180deg,#10234b,#020711)", color: "#e6f9ff", fontFamily: "Inter,ui-sans-serif,system-ui" }}>
      <section style={{ maxWidth: "42rem", border: "1px solid rgba(180,230,255,.18)", borderRadius: "1.4rem", padding: "1.4rem", background: "rgba(4,14,28,.62)" }}>
        <p style={{ letterSpacing: ".18em", textTransform: "uppercase", color: "#91dfff", fontSize: ".72rem" }}>Legacy Scroll</p>
        <h1>{demoLegacyScroll.title}</h1>
        <p>{demoLegacyScroll.narrative}</p>
        <p>Nodes: {demoLegacyScroll.nodeIds.length} · Theme: {demoLegacyScroll.visualTheme} · Status: {demoLegacyScroll.exportStatus}</p>
        <a style={{ color: "#bfefff", fontWeight: 800 }} href="/spatial/life-map">Return to Life Map</a>
      </section>
    </main>
  );
}

import Link from "next/link";

export function ArVrEntry() {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem", background: "linear-gradient(180deg,#10234b,#020711)", color: "#e6f9ff", fontFamily: "Inter,ui-sans-serif,system-ui" }}>
      <section style={{ maxWidth: "44rem", border: "1px solid rgba(180,230,255,.18)", borderRadius: "1.4rem", padding: "1.4rem", background: "rgba(4,14,28,.62)" }}>
        <p style={{ letterSpacing: ".18em", textTransform: "uppercase", color: "#91dfff", fontSize: ".72rem" }}>AR / VR Portal</p>
        <h1>Spatial anchors are ready for WebXR expansion.</h1>
        <p>This route preserves the production data contract for arVrAnchors, WebXR, mobile AR, and VR modes while the immersive headset runtime continues to mature.</p>
        <ul>
          <li>Anchor modes: webxr, mobileAr, vr</li>
          <li>Coordinate system: normalized URAI spatial world coordinates</li>
          <li>Safe fallback: return to Spatial Home or Life Map</li>
        </ul>
        <Link style={{ color: "#bfefff", fontWeight: 800 }} href="/spatial">Return to Spatial Home</Link>
      </section>
    </main>
  );
}

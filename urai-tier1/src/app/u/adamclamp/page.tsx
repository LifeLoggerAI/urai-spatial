import Link from "next/link";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export default function AdamClampPublicDemoPage() {
  return (
    <main
      data-urai-public-demo="true"
      data-public-demo-marker="urai-spatial-public-demo"
      data-testid="urai-public-demo"
      data-handle="adamclamp"
    >
      <div id="smoke-public-demo-marker" hidden>
        Public URAI Spatial Demo public Life Map preview
      </div>

      <TierOneExperience mode="home" />

      <section
        aria-label="Public URAI Spatial Demo"
        data-urai-public-demo-card="true"
        style={{
          position: "fixed",
          left: 24,
          bottom: 24,
          zIndex: 140,
          maxWidth: 360,
          border: "1px solid rgba(226, 248, 255, 0.22)",
          borderRadius: 24,
          padding: "1rem",
          background: "rgba(2, 9, 22, 0.72)",
          color: "rgb(236, 250, 255)",
          backdropFilter: "blur(14px)",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.72 }}>
          Public URAI Spatial Demo
        </p>
        <h1 style={{ margin: "0.35rem 0", fontSize: 22 }}>Adam Clamp</h1>
        <p style={{ margin: "0 0 0.8rem", lineHeight: 1.5, opacity: 0.82 }}>
          public Life Map preview. No private personal data is exposed.
        </p>
        <Link
          href="/life-map"
          style={{
            color: "rgb(236, 250, 255)",
            textDecoration: "underline",
            textUnderlineOffset: 4,
          }}
        >
          Open Life Map
        </Link>
      </section>
    </main>
  );
}

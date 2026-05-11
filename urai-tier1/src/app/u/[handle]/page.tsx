import Link from "next/link";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export function generateStaticParams() {
  return [{ handle: "adamclamp" }];
}

export default function PublicUserPage({
  params,
}: {
  params: { handle: string };
}) {
  const handle = params.handle || "adamclamp";

  return (
    <main
      data-urai-public-demo="true"
      data-public-demo-marker="urai-spatial-public-demo"
      data-testid="urai-public-demo"
      data-handle={handle}
    >
      <div id="public-demo-marker" hidden>
        public demo marker urai-spatial-public-demo URAI Spatial public demo
      </div>

      <TierOneExperience mode="home" />

      <section
        aria-label="URAI Spatial public demo marker"
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
          URAI Spatial public demo
        </p>
        <h1 style={{ margin: "0.35rem 0", fontSize: 22 }}>{handle}</h1>
        <p style={{ margin: "0 0 0.8rem", lineHeight: 1.5, opacity: 0.82 }}>
          Public-safe cinematic preview. No private personal data is exposed.
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

import { publicIndexing } from '../public-indexing'

export const metadata = {
  robots: publicIndexing,
  title: 'UrAi Terms',
  description: 'Terms for the public UrAi spatial experience, including its preview, consent, and non-clinical boundaries.',
  alternates: { canonical: 'https://urai.app/terms/' },
  openGraph: { url: 'https://urai.app/terms/', title: 'UrAi Terms', description: 'Terms for the public UrAi spatial experience, including its preview, consent, and non-clinical boundaries.' },
  twitter: { card: 'summary', title: 'UrAi Terms', description: 'Terms for the public UrAi spatial experience, including its preview, consent, and non-clinical boundaries.' },
}

const sectionStyle = { maxWidth: "860px", margin: "0 auto", display: "grid", gap: "22px" } as const;
const cardStyle = { border: "1px solid rgba(186,230,253,.16)", borderRadius: "28px", background: "rgba(3,8,20,.42)", padding: "24px", boxShadow: "0 24px 90px rgba(0,0,0,.24)" } as const;

export default function TermsPage() {
  return (
    <main style={{ minHeight: "100dvh", padding: "48px 20px", color: "white", background: "radial-gradient(circle at 50% 18%,rgba(139,92,246,.16),transparent 28%),linear-gradient(180deg,#111833,#03040d)" }}>
      <section style={sectionStyle}>
        <p style={{ letterSpacing: ".18em", textTransform: "uppercase", color: "#7defff", margin: 0 }}>URAI Spatial Terms</p>
        <h1 style={{ fontSize: "clamp(40px,8vw,76px)", lineHeight: ".92", margin: 0 }}>A cinematic interface preview, not a clinical tool.</h1>
        <p style={{ color: "rgba(235,250,255,.76)", fontSize: "18px", lineHeight: 1.7, margin: 0 }}>
          URAI Spatial is an experimental spatial interface for exploring symbolic emotional patterns. The public version may use demo, fallback, or sample data to show the product direction without exposing private personal data.
        </p>

        <div style={cardStyle}>
          <h2>Preview status</h2>
          <p>Unless a page explicitly says a provider is live, connected, consented, and validated, all biometric, memory, wearable, AR, WebXR, orb companion, and LifeMap experiences should be understood as preview or fallback behavior.</p>
        </div>

        <div style={cardStyle}>
          <h2>No medical, diagnostic, or emergency use</h2>
          <p>URAI Spatial does not provide medical advice, diagnosis, therapy, crisis response, or emergency support. Do not rely on URAI Spatial for urgent safety decisions or clinical interpretation.</p>
        </div>

        <div style={cardStyle}>
          <h2>Consent and access control</h2>
          <p>Any future live provider integration must be governed by consent, access control, deployment review, and clear labeling. Connected providers must not be represented as active until they are deployed and validated.</p>
        </div>

        <div style={cardStyle}>
          <h2>Responsible product language</h2>
          <p>Reflection summaries, LifeMap patterns, replay paths, and orb companion responses are intended to be symbolic interface language. They should help a person reflect, not define or diagnose them.</p>
        </div>
      </section>
    </main>
  );
}

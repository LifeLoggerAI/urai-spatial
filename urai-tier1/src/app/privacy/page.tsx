const sectionStyle = { maxWidth: "860px", margin: "0 auto", display: "grid", gap: "22px" } as const;
const cardStyle = { border: "1px solid rgba(186,230,253,.16)", borderRadius: "28px", background: "rgba(3,8,20,.42)", padding: "24px", boxShadow: "0 24px 90px rgba(0,0,0,.24)" } as const;

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100dvh", padding: "48px 20px", color: "white", background: "radial-gradient(circle at 50% 18%,rgba(103,232,249,.16),transparent 28%),linear-gradient(180deg,#101633,#03040d)" }}>
      <section style={sectionStyle}>
        <p style={{ letterSpacing: ".18em", textTransform: "uppercase", color: "#7defff", margin: 0 }}>URAI Spatial Privacy</p>
        <h1 style={{ fontSize: "clamp(40px,8vw,76px)", lineHeight: ".92", margin: 0 }}>A privacy-safe spatial preview.</h1>
        <p style={{ color: "rgba(235,250,255,.76)", fontSize: "18px", lineHeight: 1.7, margin: 0 }}>
          URAI Spatial is currently presented as a public-safe preview of the URAI emotional spatial interface. The public experience uses demo, fallback, or symbolic sample data unless a live provider is explicitly connected, consented, deployed, and validated.
        </p>

        <div style={cardStyle}>
          <h2>What this preview shows</h2>
          <p>Home, LifeMap, replay, reflection, orb companion, and biometric panels may appear as interface surfaces. In the public preview, those surfaces are symbolic demonstrations and should be read as product language, not as live private analysis.</p>
        </div>

        <div style={cardStyle}>
          <h2>What this preview does not expose</h2>
          <ul>
            <li>No raw private memory data is shown in the public preview.</li>
            <li>No raw biometric stream is shown in the public preview.</li>
            <li>Wearable integrations remain fallback-only until explicit consent, deployment review, and runtime validation are complete.</li>
            <li>AR, WebXR, and camera-based integrations remain fallback-only until explicit consent, deployment review, and runtime validation are complete.</li>
          </ul>
        </div>

        <div style={cardStyle}>
          <h2>No diagnosis or emergency use</h2>
          <p>URAI Spatial is not a medical device, diagnostic tool, therapist, crisis service, or emergency response system. Reflection language is intended to be gentle and symbolic. It should not be treated as clinical advice.</p>
        </div>

        <div style={cardStyle}>
          <h2>Provider activation rule</h2>
          <p>Live integrations must be reviewed before production activation. Any provider that touches personal data, biometric data, memory data, wearable data, AR/WebXR state, or account-specific history must require consent, access control, deployment review, and clear UI labeling.</p>
        </div>
      </section>
    </main>
  );
}

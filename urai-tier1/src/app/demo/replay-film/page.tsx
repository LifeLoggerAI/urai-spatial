import Link from "next/link";

export const dynamic = "force-static";

const scenes = [
  ["01", "Pressure", "Real life signals stack up: calendar, messages, decisions, body state, and unfinished work."],
  ["02", "Open URAI", "The phone becomes a doorway into a living private world."],
  ["03", "Orb Chat", "The orb opens chat. Chat is the doorway; the world is the interface."],
  ["04", "Self-avatar State", "Private body and life signals are controlled by the user. No diagnosis claims."],
  ["05", "Ground Workforce", "Models prepare, suggest, and organize. The user reviews, approves, and controls."],
  ["06", "Council", "Specialized roles gather around the work: planning, memory, privacy, strategy, creative, and care."],
  ["07", "Sky Ascent", "The user rises from ground work into the meaning layer."],
  ["08", "Life Map", "Memories become stars. Chapters become constellations. Patterns become visible."],
  ["09", "Protected Legacy", "Legacy stays protected. Presence requires permission."],
  ["10", "Focus Seed", "One selected memory opens as a quiet chamber."],
  ["11", "Replay Layers", "What happened. Who was there. What it meant. What changed after. What remains."],
  ["12", "Mirror", "Repeating patterns become visible without judgment."],
  ["13", "Passport", "Data belongs to the user. Access, export, delete, and model permissions stay user-controlled."],
  ["14", "AR / XR / VR", "The world can extend from phone to room to headset."],
  ["15", "CTA", "Create Your World."]
];

const routeLinks = [
  ["/home", "Home"],
  ["/life-map", "Life Map"],
  ["/focus", "Focus"],
  ["/replay", "Replay"],
  ["/mirror", "Mirror"],
  ["/passport", "Passport"],
  ["/status", "Status"]
];

export default function CutOneReplayFilmPage() {
  return (
    <main style={{
      minHeight: "100vh",
      color: "#fff7ed",
      background:
        "radial-gradient(circle at 20% 10%, rgba(139,92,246,.35), transparent 30%), radial-gradient(circle at 80% 20%, rgba(56,189,248,.22), transparent 28%), linear-gradient(180deg, #08030f 0%, #14091f 48%, #050208 100%)",
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      overflow: "hidden"
    }}>
      <section style={{
        padding: "72px clamp(20px, 6vw, 88px) 36px",
        display: "grid",
        gap: 28,
        gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, .8fr)",
        alignItems: "center"
      }}>
        <div>
          <p style={{letterSpacing: ".22em", textTransform: "uppercase", color: "#c4b5fd", fontSize: 12}}>
            URAI First Replay / Cut One
          </p>
          <h1 style={{fontSize: "clamp(42px, 8vw, 96px)", lineHeight: ".92", margin: "14px 0 20px"}}>
            Your life is a world.
          </h1>
          <p style={{fontSize: "clamp(18px, 2.2vw, 26px)", color: "#f5d0fe", maxWidth: 760}}>
            A playable launch proof for the first cinematic Replay flow: pressure to portal, ground to sky,
            Life Map to Replay, Mirror to Passport, and finally Create Your World.
          </p>
          <div style={{display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28}}>
            <a href="#film" style={buttonPrimary}>Play proof rail</a>
            <Link href="/home" style={buttonSecondary}>Enter Home</Link>
          </div>
        </div>

        <div style={{
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: 32,
          padding: 24,
          background: "rgba(8,3,15,.66)",
          boxShadow: "0 30px 100px rgba(0,0,0,.45)"
        }}>
          <div style={{
            aspectRatio: "1",
            borderRadius: "50%",
            background: "radial-gradient(circle, #fff 0%, #a78bfa 18%, #38bdf8 34%, rgba(56,189,248,.08) 62%, transparent 70%)",
            boxShadow: "0 0 80px rgba(167,139,250,.65)",
            display: "grid",
            placeItems: "center",
            color: "#12051d",
            fontWeight: 900,
            textAlign: "center"
          }}>
            ORB<br />OPENS<br />CHAT
          </div>
          <p style={{color: "#ddd6fe", marginTop: 18}}>
            “I organized the signals. One needs your decision. Two can wait. One connects to a pattern from last month.”
          </p>
        </div>
      </section>

      <section id="film" style={{padding: "24px clamp(20px, 6vw, 88px) 72px"}}>
        <div style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))"
        }}>
          {scenes.map(([number, title, detail]) => (
            <article key={number} style={{
              minHeight: 220,
              border: "1px solid rgba(255,255,255,.14)",
              borderRadius: 24,
              padding: 20,
              background: "linear-gradient(145deg, rgba(255,255,255,.09), rgba(255,255,255,.03))",
              boxShadow: "0 24px 80px rgba(0,0,0,.24)"
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: "rgba(196,181,253,.18)",
                color: "#ddd6fe",
                border: "1px solid rgba(221,214,254,.35)",
                marginBottom: 16,
                fontWeight: 800
              }}>
                {number}
              </div>
              <h2 style={{fontSize: 24, margin: "0 0 10px"}}>{title}</h2>
              <p style={{color: "#e9d5ff", lineHeight: 1.55, margin: 0}}>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{
        margin: "0 clamp(20px, 6vw, 88px) 72px",
        borderRadius: 32,
        border: "1px solid rgba(255,255,255,.18)",
        background: "rgba(255,255,255,.07)",
        padding: "32px clamp(20px, 5vw, 52px)"
      }}>
        <p style={{letterSpacing: ".18em", textTransform: "uppercase", color: "#bae6fd", fontSize: 12}}>
          Launch route chain
        </p>
        <div style={{display: "flex", flexWrap: "wrap", gap: 12, margin: "18px 0 28px"}}>
          {routeLinks.map(([href, label]) => (
            <Link key={href} href={href} style={chip}>{label}</Link>
          ))}
        </div>
        <h2 style={{fontSize: "clamp(34px, 5vw, 64px)", margin: "0 0 16px"}}>
          Create Your World
        </h2>
        <p style={{maxWidth: 780, color: "#f5d0fe", fontSize: 20, lineHeight: 1.5}}>
          URAI handles the noise. You live the life. Your memories, relationships, patterns,
          and permissions become a world you can step inside.
        </p>
        <Link href="/home" style={buttonPrimary}>Create Your World</Link>
      </section>
    </main>
  );
}

const buttonPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "14px 20px",
  background: "#f5f3ff",
  color: "#12051d",
  fontWeight: 900,
  textDecoration: "none"
};

const buttonSecondary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "14px 20px",
  border: "1px solid rgba(255,255,255,.25)",
  color: "#fff7ed",
  fontWeight: 800,
  textDecoration: "none"
};

const chip = {
  display: "inline-flex",
  borderRadius: 999,
  padding: "10px 14px",
  background: "rgba(255,255,255,.08)",
  border: "1px solid rgba(255,255,255,.16)",
  color: "#fff7ed",
  textDecoration: "none",
  fontWeight: 800
};

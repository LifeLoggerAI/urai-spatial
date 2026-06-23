export const metadata = {
  title: "URAI Cut One Replay Film",
  description: "Playable launch review route for the first URAI cinematic proof flow.",
};

const scenes = [
  ["00:00", "Pressure", "Life moves fast. The opening beat shows alerts, calendar weight, unfinished work, and one human decision."],
  ["00:08", "Open URAI", "The phone opens into Home World with ground, sky, orb, avatar, and a path into the real route chain."],
  ["00:14", "Orb chat", "The orb opens a normal chat doorway with Review, Approve, and Open Life Map actions."],
  ["00:22", "Self avatar", "A user-controlled state panel shows energy, rest debt, focus window, and check-in signals without clinical claims."],
  ["00:32", "Ground crew", "Calendar, inbox, tasks, decisions, and permission gates become a walkable operations layer."],
  ["00:45", "Council", "Planner, memory, operator, privacy, mirror, and relationship roles prepare and suggest while the user stays in control."],
  ["00:55", "Sky ascent", "The camera rises from ground work through clouds into the meaning layer."],
  ["01:04", "Life Map", "Memory stars, chapter clusters, places, people, and pattern weather form the constellation."],
  ["01:16", "Legacy node", "Protected artifacts, initials, photos, place markers, and consent rings show that presence requires permission."],
  ["01:28", "Focus seed", "A selected star becomes the moss, crystal, and blue-equation memory seed with a Replay entry."],
  ["01:37", "Replay layers", "What happened, who was there, what it meant, what changed after, and what remains appear as explorable layers."],
  ["01:50", "Mirror", "Repeated choices, relationship arcs, stress cycles, recovery moments, and creative surges become visible."],
  ["01:56", "Passport", "The vault proves ownership, export, delete, sharing states, and model access controls."],
  ["02:04", "AR XR VR", "The same world extends from phone into room-scale and headset-scale previews."],
  ["02:12", "CTA", "Create Your World returns the viewer to the real product path."],
] as const;

const chain = [
  ["Home", "/home"],
  ["Life Map", "/life-map"],
  ["Focus", "/focus?memoryId=quiet-reset"],
  ["Replay", "/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread"],
  ["Mirror", "/mirror"],
  ["Passport", "/passport"],
  ["Status", "/status"],
] as const;

export function generateStaticParams() {
  return [{ slug: "replay-film" }];
}

export default function CutOneReplayFilmPage() {
  return (
    <main style={{ minHeight: "100svh", color: "#eef6ff", background: "radial-gradient(circle at 15% 10%, rgba(125,211,252,.24), transparent 28rem), radial-gradient(circle at 80% 0%, rgba(168,85,247,.22), transparent 30rem), linear-gradient(145deg,#020617,#071126 58%,#0f172a)", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", overflow: "hidden" }}>
      <section style={{ width: "min(1180px, calc(100% - 32px))", margin: "0 auto", padding: "clamp(32px,6vw,76px) 0" }}>
        <p style={{ color: "#67e8f9", letterSpacing: ".18em", textTransform: "uppercase", fontSize: ".75rem", fontWeight: 900 }}>URAI Spatial · Cut One proof route</p>
        <h1 style={{ margin: "14px 0", maxWidth: "12ch", fontSize: "clamp(3rem,9vw,7.6rem)", lineHeight: ".86", letterSpacing: "-.08em" }}>Your life is a world.</h1>
        <p style={{ maxWidth: "74ch", color: "rgba(238,246,255,.78)", fontSize: "clamp(1rem,1.5vw,1.22rem)", lineHeight: 1.65 }}>A playable launch-review surface for the first URAI Replay film flow. It proves the product beats, keeps language user-controlled, and links back into the real URAI route chain.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
          <a href="/home" style={{ color: "#020617", background: "#67e8f9", padding: "14px 18px", borderRadius: 999, fontWeight: 900, textDecoration: "none" }}>Create Your World</a>
          <a href="/life-map" style={{ color: "#eef6ff", border: "1px solid rgba(238,246,255,.28)", padding: "14px 18px", borderRadius: 999, fontWeight: 800, textDecoration: "none" }}>Enter Life Map</a>
        </div>
      </section>

      <section style={{ width: "min(1180px, calc(100% - 32px))", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, paddingBottom: 34 }} aria-label="Cut One scene rail">
        {scenes.map(([time, title, body], index) => (
          <article key={title} style={{ minHeight: 178, border: "1px solid rgba(186,230,253,.18)", borderRadius: 28, padding: 18, background: "linear-gradient(145deg, rgba(15,23,42,.72), rgba(2,6,23,.48))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" }}>
            <small style={{ color: "#67e8f9", fontWeight: 900, letterSpacing: ".12em" }}>{time} · {String(index + 1).padStart(2, "0")}</small>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.2rem" }}>{title}</h2>
            <p style={{ margin: 0, color: "rgba(238,246,255,.72)", lineHeight: 1.55 }}>{body}</p>
          </article>
        ))}
      </section>

      <section style={{ width: "min(1180px, calc(100% - 32px))", margin: "0 auto", padding: "18px 0 70px" }}>
        <div style={{ border: "1px solid rgba(103,232,249,.26)", borderRadius: 32, padding: "clamp(20px,4vw,38px)", background: "rgba(2,6,23,.68)" }}>
          <h2 style={{ marginTop: 0 }}>Safety and trust proof</h2>
          <p style={{ color: "rgba(238,246,255,.76)", lineHeight: 1.65 }}>No medical diagnosis claims. Legacy stays protected. Presence requires permission. Data belongs to the user. Body and life signals are controlled by the user. Models prepare, suggest, and organize; the user reviews, approves, and controls.</p>
          <nav aria-label="URAI launch route chain" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
            {chain.map(([label, href]) => <a key={href} href={href} style={{ color: "#eef6ff", textDecoration: "none", border: "1px solid rgba(238,246,255,.18)", borderRadius: 999, padding: "10px 13px" }}>{label}</a>)}
          </nav>
        </div>
      </section>
    </main>
  );
}

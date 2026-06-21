export const dynamic = 'force-static'

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>URAI Privacy Controls</title>
  <meta name="description" content="URAI privacy controls for consent, identity, memory access, and provenance." />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; color: #eef6ff; background: radial-gradient(circle at 58% 42%, rgba(103,232,249,.16), transparent 18rem), radial-gradient(circle at 82% 20%, rgba(168,85,247,.18), transparent 34rem), linear-gradient(150deg, #020617, #071126 52%, #0f172a); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; overflow-x: hidden; }
    body:before { content: ""; position: fixed; inset: auto -8vw -28vw 24vw; aspect-ratio: 1; border-radius: 999px; border: 1px solid rgba(186,230,253,.09); background: radial-gradient(circle at 50% 34%, rgba(45,212,191,.16), rgba(14,165,233,.07) 36%, transparent 68%); box-shadow: 0 0 180px rgba(14,165,233,.12); pointer-events: none; }
    main { position: relative; min-height: 100vh; display: grid; align-items: center; padding: clamp(28px, 6vw, 82px); }
    .layout { width: min(1180px, 100%); display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .68fr); gap: clamp(26px, 5vw, 72px); align-items: center; }
    .kicker { color: #67e8f9; letter-spacing: .22em; text-transform: uppercase; font-size: .72rem; font-weight: 950; }
    h1 { margin: 14px 0 18px; max-width: 10ch; font-size: clamp(4rem, 9vw, 8.8rem); line-height: .82; letter-spacing: -.095em; text-shadow: 0 24px 110px rgba(103,232,249,.17); }
    p { color: rgba(238,246,255,.78); line-height: 1.65; font-size: clamp(1rem, 1.28vw, 1.16rem); }
    .actions, nav { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
    a { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; border: 1px solid rgba(147,197,253,.26); border-radius: 999px; padding: 0 16px; color: #eaf4ff; text-decoration: none; background: rgba(2,6,23,.36); font-weight: 900; backdrop-filter: blur(16px); }
    a.primary { color: #02111d; background: linear-gradient(135deg, #ccfbf1, #67e8f9 56%, #93c5fd); border-color: rgba(103,232,249,.7); box-shadow: 0 0 44px rgba(103,232,249,.26); }
    .control { display: grid; gap: 14px; }
    .gate { border: 1px solid rgba(186,230,253,.16); border-radius: 26px; padding: 18px; background: rgba(2,6,23,.42); box-shadow: 0 26px 90px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06); backdrop-filter: blur(22px); }
    .gate strong { display: block; color: white; margin-bottom: 7px; }
    nav { position: fixed; right: 24px; bottom: 22px; margin: 0; }
    @media (max-width: 850px) { .layout { grid-template-columns: 1fr; } nav { left: 12px; right: 12px; justify-content: center; } h1 { font-size: clamp(3.4rem, 16vw, 5.4rem); } }
  </style>
</head>
<body>
  <main>
    <section class="layout">
      <div>
        <p class="kicker">URAI Passport Controls</p>
        <h1>Choose what the world can hold.</h1>
        <p>Privacy is part of the world surface. Identity, consent, provenance, and memory access stay visible before a star, replay, or reflection expands.</p>
        <div class="actions">
          <a class="primary" href="/passport">Open Passport</a>
          <a href="/life-map">Return to Life Map</a>
        </div>
      </div>
      <aside class="control" aria-label="Privacy controls">
        <div class="gate"><strong>Identity stays owned</strong><p>Your world has a visible owner and clear permission boundaries.</p></div>
        <div class="gate"><strong>Memory access is gated</strong><p>Private detail remains closed until the route makes access intentional.</p></div>
        <div class="gate"><strong>Provenance stays attached</strong><p>Every surface can explain why it appears and where it came from.</p></div>
      </aside>
    </section>
    <nav aria-label="URAI routes"><a href="/home">Home</a><a href="/focus?memoryId=quiet-reset">Focus</a><a href="/replay">Replay</a><a href="/status">Status</a></nav>
  </main>
</body>
</html>`

export function GET() {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  })
}

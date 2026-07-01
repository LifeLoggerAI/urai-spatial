import Link from 'next/link'

const rail = [
  ['Life Map', '/life-map'],
  ['Focus', '/focus?memoryId=quiet-reset'],
  ['Replay', '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread'],
  ['Mirror', '/mirror'],
  ['Passport', '/passport'],
] as const

function RouteRail({ active }: { active: string }) {
  return (
    <nav className="memoryNav" aria-label="URAI memory route chain">
      {rail.map(([label, href]) => (
        <Link key={href} href={href} data-active={label === active ? 'true' : 'false'}>
          {label}
        </Link>
      ))}
    </nav>
  )
}

function GalaxyField() {
  return (
    <>
      <div className="memoryVoid" />
      <div className="memoryCloud cloudA" />
      <div className="memoryCloud cloudB" />
      <div className="memoryDust" />
      <div className="memoryOrbit orbitA" />
      <div className="memoryOrbit orbitB" />
    </>
  )
}

function MemoryStar() {
  return (
    <div className="memoryStarCore" aria-hidden="true">
      <span className="halo" />
      <span className="core" />
      <span className="spike one" />
      <span className="spike two" />
    </div>
  )
}

function SharedStyles() {
  return (
    <style>{`
      .memorySurface {
        position: relative;
        min-height: 100vh;
        overflow: hidden;
        color: white;
        background: #000107;
        isolation: isolate;
      }
      .memoryVoid {
        position: absolute;
        inset: 0;
        z-index: 0;
        background:
          radial-gradient(circle at 50% 40%, rgba(255,255,255,0.12), transparent 10%),
          radial-gradient(circle at 34% 46%, rgba(80,228,255,0.14), transparent 30%),
          radial-gradient(circle at 72% 38%, rgba(178,94,255,0.16), transparent 30%),
          linear-gradient(180deg,#00020a 0%,#020411 56%,#000106 100%);
      }
      .memoryCloud {
        position: absolute;
        z-index: 1;
        border-radius: 999px;
        filter: blur(34px);
        opacity: 0.42;
      }
      .cloudA { left: 10%; top: 24%; width: 64vw; height: 42vh; background: radial-gradient(ellipse, rgba(95,232,255,0.28), rgba(95,232,255,0.06) 48%, transparent 74%); transform: rotate(-8deg); }
      .cloudB { right: -6%; top: 18%; width: 60vw; height: 46vh; background: radial-gradient(ellipse, rgba(210,126,255,0.28), rgba(210,126,255,0.06) 48%, transparent 74%); transform: rotate(9deg); }
      .memoryDust {
        position: absolute;
        inset: -12%;
        z-index: 2;
        opacity: 0.44;
        background-image:
          radial-gradient(circle, rgba(255,255,255,0.86) 0 1px, transparent 1.25px),
          radial-gradient(circle, rgba(140,232,255,0.64) 0 1px, transparent 1.2px),
          radial-gradient(circle, rgba(220,190,255,0.54) 0 1px, transparent 1.15px);
        background-size: 101px 101px, 163px 163px, 251px 251px;
        background-position: 0 0, 41px 62px, 101px 19px;
      }
      .memoryOrbit {
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 3;
        width: 86vw;
        height: 34vh;
        border: 1px solid rgba(196,245,255,0.11);
        border-left-color: transparent;
        border-radius: 50%;
        transform: translate(-50%,-50%) rotate(-9deg);
        filter: drop-shadow(0 0 32px rgba(103,232,249,0.12));
      }
      .orbitB { width: 62vw; height: 24vh; transform: translate(-50%,-50%) rotate(14deg); opacity: 0.54; }
      .memoryStage {
        position: relative;
        z-index: 10;
        min-height: 100vh;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 410px);
        align-items: center;
        gap: 2rem;
        padding: 5.5rem 2rem 7.5rem;
      }
      .memoryTitle,
      .memoryPanel {
        border: 1px solid rgba(255,255,255,0.12);
        background: linear-gradient(145deg, rgba(0,0,0,0.58), rgba(8,16,30,0.34));
        box-shadow: 0 28px 90px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.08);
        backdrop-filter: blur(20px);
      }
      .memoryTitle { max-width: 520px; border-radius: 2rem; padding: 1.1rem; }
      .memoryTitle p,
      .memoryPanel p { margin: 0; color: rgba(165,243,252,0.9); font-size: 10px; font-weight: 950; letter-spacing: 0.25em; text-transform: uppercase; }
      .memoryTitle h1 { margin: 0.45rem 0 0; font-size: clamp(3.2rem, 8vw, 7.8rem); line-height: 0.8; letter-spacing: -0.1em; }
      .memoryTitle span,
      .memoryPanel span { display: block; margin-top: 0.75rem; color: rgba(235,252,255,0.78); font-size: 0.94rem; font-weight: 750; line-height: 1.5; }
      .memoryPanel { border-radius: 2rem; padding: 1rem; }
      .memoryPanel h2 { margin: 0.45rem 0 0; font-size: clamp(1.65rem, 3vw, 2.4rem); line-height: 0.96; letter-spacing: -0.055em; }
      .memoryCard {
        position: relative;
        min-height: 300px;
        margin-bottom: 1rem;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 1.5rem;
        background:
          radial-gradient(circle at 50% 36%, rgba(255,255,255,0.24), transparent 16%),
          radial-gradient(circle at 62% 58%, rgba(255,123,214,0.2), transparent 30%),
          radial-gradient(circle at 35% 68%, rgba(125,248,255,0.22), transparent 34%),
          linear-gradient(135deg,#09131f,#17293b 42%,#3a2445 70%,#05080f);
        box-shadow: inset 0 0 90px rgba(255,255,255,0.08);
      }
      .memoryCard::before { content: ''; position: absolute; left: -10%; right: -10%; top: 54%; height: 1px; background: linear-gradient(90deg, transparent, rgba(190,245,255,0.58), transparent); box-shadow: 0 0 44px rgba(103,232,249,0.38); }
      .memoryCard::after { content: ''; position: absolute; left: -18%; bottom: -30%; width: 140%; height: 54%; background: radial-gradient(ellipse, rgba(125,248,255,0.3), transparent 62%); filter: blur(22px); }
      .memoryStarCore { position: absolute; left: 50%; top: 25%; z-index: 8; width: 18px; height: 18px; transform: translate(-50%,-50%); }
      .memoryStarCore span { position: absolute; left: 50%; top: 50%; pointer-events: none; }
      .memoryStarCore .halo { width: 170px; height: 170px; transform: translate(-50%,-50%); border-radius: 999px; background: radial-gradient(circle, rgba(255,255,255,0.9) 0 3%, #9ff7ff 12%, rgba(159,247,255,0.12) 34%, transparent 70%); filter: blur(4px); opacity: 0.76; animation: chamberBreath 4.6s ease-in-out infinite alternate; }
      .memoryStarCore .core { width: 16px; height: 16px; transform: translate(-50%,-50%); border-radius: 999px; background: radial-gradient(circle, white 0 20%, #bffcff 22% 48%, #52bfff 50% 70%, transparent 72%); box-shadow: 0 0 18px white, 0 0 52px #7df8ff, 0 0 120px rgba(125,248,255,0.42); }
      .memoryStarCore .spike { width: 2px; height: 78px; transform: translate(-50%,-50%); border-radius: 999px; background: linear-gradient(180deg, transparent, rgba(255,255,255,0.72), transparent); opacity: 0.48; }
      .memoryStarCore .two { transform: translate(-50%,-50%) rotate(90deg); opacity: 0.3; }
      .actions { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-top: 1rem; }
      .actions a { border: 1px solid rgba(255,255,255,0.16); border-radius: 999px; padding: 0.72rem 1rem; background: rgba(255,255,255,0.06); color: white; font-size: 12px; font-weight: 950; text-decoration: none; }
      .actions a:first-child { background: rgba(207,250,254,0.96); color: #020617; }
      .beatRail { display: grid; gap: 0.5rem; margin-top: 1rem; }
      .beatRail span { border: 1px solid rgba(255,255,255,0.12); border-radius: 1rem; background: rgba(255,255,255,0.055); padding: 0.65rem 0.8rem; color: rgba(236,254,255,0.84); font-size: 12px; font-weight: 900; }
      .beatRail span[data-active='true'] { background: rgba(207,250,254,0.92); color: #020617; }
      .memoryNav { position: fixed; left: 50%; bottom: 1rem; z-index: 40; display: flex; max-width: calc(100vw - 1.5rem); transform: translateX(-50%); gap: 0.35rem; overflow-x: auto; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; background: rgba(0,0,0,0.52); padding: 0.42rem; backdrop-filter: blur(18px); }
      .memoryNav a { border: 1px solid rgba(207,250,254,0.12); border-radius: 999px; padding: 0.52rem 0.82rem; color: rgba(236,254,255,0.86); font-size: 11px; font-weight: 950; text-decoration: none; white-space: nowrap; }
      .memoryNav a[data-active='true'] { background: rgba(207,250,254,0.95); color: #020617; }
      @keyframes chamberBreath { from { transform: translate(-50%,-50%) scale(0.9); opacity: 0.62; } to { transform: translate(-50%,-50%) scale(1.1); opacity: 0.88; } }
      @media (max-width: 850px) {
        .memoryStage { grid-template-columns: 1fr; padding: 4.75rem 0.75rem 9rem; align-items: start; }
        .memoryTitle { max-width: 330px; padding: 0.9rem; }
        .memoryTitle h1 { font-size: 2.6rem; }
        .memoryPanel { margin-top: min(35vh, 260px); }
        .memoryCard { min-height: 220px; }
        .memoryNav { width: calc(100vw - 1rem); justify-content: flex-start; bottom: 0.75rem; }
      }
    `}</style>
  )
}

export function FinalFocusChamber() {
  return (
    <main className="memorySurface" data-testid="urai-final-focus-chamber" data-route-polish="selected-memory-camera-chamber" data-canon="camera-from-life-map-no-avatar-orb">
      <GalaxyField />
      <section className="memoryStage">
        <div className="memoryTitle">
          <p>URAI · Focus</p>
          <h1>Selected memory chamber.</h1>
          <span>The Life Map camera is now inside one private star. Focus holds the image, signal, and one clear doorway into Replay.</span>
          <div className="actions">
            <Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&from=focus-camera">Camera into Replay</Link>
            <Link href="/life-map?unwind=focus">Unwind to Life Map</Link>
          </div>
        </div>
        <aside className="memoryPanel">
          <div className="memoryCard"><MemoryStar /></div>
          <p>Memory readout</p>
          <h2>The Quiet Reset</h2>
          <span>Image, body signal, and context stay in one spatial chamber. Replay is one camera move away.</span>
          <div className="beatRail">
            <span data-active="true">Private star selected</span>
            <span>Ground and orb stay behind</span>
            <span>Replay ready</span>
          </div>
        </aside>
      </section>
      <RouteRail active="Focus" />
      <SharedStyles />
    </main>
  )
}

export function FinalReplayFilm() {
  const beats = ['Pressure arrives', 'Ground anchor', 'Camera enters star', 'Body return', 'Meaning forms', 'Mirror next'] as const
  return (
    <main className="memorySurface" data-testid="urai-final-replay-film" data-route-polish="cinematic-memory-camera-film" data-canon="camera-from-focus-no-avatar-orb">
      <GalaxyField />
      <section className="memoryStage">
        <div className="memoryTitle">
          <p>URAI · Replay</p>
          <h1>Memory film.</h1>
          <span>Replay keeps the same galaxy language and moves deeper through the selected memory as a cinematic sequence.</span>
          <div className="actions">
            <Link href="/mirror">Open Mirror</Link>
            <Link href="/focus?memoryId=quiet-reset&unwind=replay">Unwind to Focus</Link>
          </div>
        </div>
        <aside className="memoryPanel">
          <div className="memoryCard"><MemoryStar /></div>
          <p>Replay thread active</p>
          <h2>The Quiet Reset</h2>
          <span>The memory opens as atmosphere, rhythm, and return path — not a static poster.</span>
          <div className="beatRail">
            {beats.map((beat, index) => <span key={beat} data-active={index === 2 ? 'true' : 'false'}>{index + 1}. {beat}</span>)}
          </div>
        </aside>
      </section>
      <RouteRail active="Replay" />
      <SharedStyles />
    </main>
  )
}

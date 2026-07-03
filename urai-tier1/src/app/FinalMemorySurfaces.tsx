import Link from 'next/link'
import type { CSSProperties } from 'react'
import { assetCssStack, focusAssets, replayAssets, uiAssets } from '@/spatial/assets/uraiAssets'

const rail = [
  ['Life Map', '/life-map'],
  ['Focus', '/focus?memoryId=quiet-reset'],
  ['Replay', '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread'],
  ['Mirror', '/mirror'],
  ['Passport', '/passport'],
] as const

const replayBeats = ['Pressure arrives', 'Ground anchor', 'Camera enters star', 'Body return', 'Meaning forms', 'Mirror next'] as const

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

function routeStyle(routeAsset: string): CSSProperties {
  return {
    '--memory-route-art': routeAsset,
    '--memory-orb-art': assetCssStack(uiAssets.orbActive),
  } as CSSProperties
}

function SharedStyles() {
  return (
    <style>{`
      .memorySurface {
        position: relative;
        min-height: 100svh;
        overflow: hidden;
        color: white;
        background: #000107;
        isolation: isolate;
      }

      .memorySurface::before {
        content: '';
        position: absolute;
        inset: -10vh -10vw;
        z-index: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 50% 38%, rgba(255,255,255,.14), transparent 10rem),
          radial-gradient(circle at 31% 48%, rgba(80,228,255,.14), transparent 24rem),
          radial-gradient(circle at 72% 38%, rgba(178,94,255,.16), transparent 24rem),
          linear-gradient(180deg,#00020a 0%,#020411 56%,#000106 100%);
      }

      .memoryVoid,
      .memoryCloud,
      .memoryDust,
      .memoryOrbit {
        position: absolute;
        pointer-events: none;
      }

      .memoryVoid {
        inset: 0;
        z-index: 0;
        background:
          radial-gradient(ellipse at 50% 50%, rgba(255,255,255,.05), transparent 34%),
          radial-gradient(ellipse at 42% 54%, rgba(80,228,255,.12), transparent 38%),
          radial-gradient(ellipse at 66% 42%, rgba(178,94,255,.13), transparent 38%);
      }

      .memoryCloud {
        z-index: 1;
        border-radius: 999px;
        filter: blur(36px);
        opacity: .42;
      }

      .cloudA { left: 8%; top: 24%; width: 64vw; height: 42vh; background: radial-gradient(ellipse, rgba(95,232,255,.28), rgba(95,232,255,.06) 48%, transparent 74%); transform: rotate(-8deg); }
      .cloudB { right: -6%; top: 18%; width: 60vw; height: 46vh; background: radial-gradient(ellipse, rgba(210,126,255,.28), rgba(210,126,255,.06) 48%, transparent 74%); transform: rotate(9deg); }

      .memoryDust {
        inset: -12%;
        z-index: 2;
        opacity: .42;
        background-image:
          radial-gradient(circle, rgba(255,255,255,.84) 0 1px, transparent 1.24px),
          radial-gradient(circle, rgba(140,232,255,.64) 0 1px, transparent 1.2px),
          radial-gradient(circle, rgba(220,190,255,.54) 0 1px, transparent 1.15px);
        background-size: 101px 101px, 163px 163px, 251px 251px;
        background-position: 0 0, 41px 62px, 101px 19px;
      }

      .memoryOrbit {
        left: 50%;
        top: 50%;
        z-index: 3;
        width: 86vw;
        height: 34vh;
        border: 1px solid rgba(196,245,255,.11);
        border-left-color: transparent;
        border-radius: 50%;
        transform: translate(-50%,-50%) rotate(-9deg);
        filter: drop-shadow(0 0 32px rgba(103,232,249,.12));
      }

      .orbitB { width: 62vw; height: 24vh; transform: translate(-50%,-50%) rotate(14deg); opacity: .54; }

      .memoryStage {
        position: relative;
        z-index: 10;
        min-height: 100svh;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 430px);
        align-items: center;
        gap: 2rem;
        padding: 5.5rem 2rem 7.5rem;
      }

      .memoryTitle,
      .memoryPanel {
        border: 1px solid rgba(255,255,255,.12);
        background: linear-gradient(145deg, rgba(0,0,0,.58), rgba(8,16,30,.34));
        box-shadow: 0 28px 90px rgba(0,0,0,.52), inset 0 1px 0 rgba(255,255,255,.08);
        backdrop-filter: blur(20px);
      }

      .memoryTitle { max-width: 540px; border-radius: 2rem; padding: 1.1rem; }
      .memoryTitle p,
      .memoryPanel p { margin: 0; color: rgba(165,243,252,.9); font-size: 10px; font-weight: 950; letter-spacing: .25em; text-transform: uppercase; }
      .memoryTitle h1 { margin: .45rem 0 0; font-size: clamp(3.2rem, 8vw, 7.8rem); line-height: .8; letter-spacing: -.1em; }
      .memoryTitle span,
      .memoryPanel span { display: block; margin-top: .75rem; color: rgba(235,252,255,.78); font-size: .94rem; font-weight: 750; line-height: 1.5; }
      .memoryPanel { border-radius: 2rem; padding: 1rem; }
      .memoryPanel h2 { margin: .45rem 0 0; font-size: clamp(1.65rem, 3vw, 2.4rem); line-height: .96; letter-spacing: -.055em; }

      .memoryCard {
        position: relative;
        min-height: 318px;
        margin-bottom: 1rem;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 1.5rem;
        background:
          linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.72)),
          var(--memory-route-art),
          radial-gradient(circle at 50% 36%, rgba(255,255,255,.24), transparent 16%),
          radial-gradient(circle at 62% 58%, rgba(255,123,214,.2), transparent 30%),
          radial-gradient(circle at 35% 68%, rgba(125,248,255,.22), transparent 34%),
          linear-gradient(135deg,#09131f,#17293b 42%,#3a2445 70%,#05080f);
        background-size: cover, cover, auto, auto, auto, auto;
        background-position: center;
        box-shadow: inset 0 0 90px rgba(255,255,255,.08), 0 28px 90px rgba(0,0,0,.4);
      }

      .memoryCard::before { content: ''; position: absolute; left: -10%; right: -10%; top: 54%; height: 1px; background: linear-gradient(90deg, transparent, rgba(190,245,255,.58), transparent); box-shadow: 0 0 44px rgba(103,232,249,.38); }
      .memoryCard::after { content: ''; position: absolute; left: -18%; bottom: -30%; width: 140%; height: 54%; background: radial-gradient(ellipse, rgba(125,248,255,.3), transparent 62%); filter: blur(22px); }

      .memoryStarCore { position: absolute; left: 50%; top: 25%; z-index: 8; width: 18px; height: 18px; transform: translate(-50%,-50%); }
      .memoryStarCore span { position: absolute; left: 50%; top: 50%; pointer-events: none; }
      .memoryStarCore .halo { width: 180px; height: 180px; transform: translate(-50%,-50%); border-radius: 999px; background: radial-gradient(circle, rgba(255,255,255,.9) 0 3%, #9ff7ff 12%, rgba(159,247,255,.12) 34%, transparent 70%); filter: blur(4px); opacity: .78; animation: chamberBreath 4.6s ease-in-out infinite alternate; }
      .memoryStarCore .core { width: 16px; height: 16px; transform: translate(-50%,-50%); border-radius: 999px; background: radial-gradient(circle, white 0 20%, #bffcff 22% 48%, #52bfff 50% 70%, transparent 72%); box-shadow: 0 0 18px white, 0 0 52px #7df8ff, 0 0 120px rgba(125,248,255,.42); }
      .memoryStarCore .spike { width: 2px; height: 78px; transform: translate(-50%,-50%); border-radius: 999px; background: linear-gradient(180deg, transparent, rgba(255,255,255,.72), transparent); opacity: .48; }
      .memoryStarCore .two { transform: translate(-50%,-50%) rotate(90deg); opacity: .3; }

      .orbEcho {
        position: absolute;
        right: 1rem;
        top: 1rem;
        z-index: 30;
        width: 58px;
        height: 58px;
        border-radius: 999px;
        border: 1px solid rgba(165,243,252,.2);
        background-image: var(--memory-orb-art);
        background-size: cover;
        background-position: center;
        box-shadow: 0 0 60px rgba(103,232,249,.28);
        opacity: .9;
      }

      .actions { display: flex; flex-wrap: wrap; gap: .55rem; margin-top: 1rem; }
      .actions a { border: 1px solid rgba(255,255,255,.16); border-radius: 999px; padding: .72rem 1rem; background: rgba(255,255,255,.06); color: white; font-size: 12px; font-weight: 950; text-decoration: none; }
      .actions a:first-child { background: rgba(207,250,254,.96); color: #020617; }
      .beatRail { display: grid; gap: .5rem; margin-top: 1rem; }
      .beatRail span { border: 1px solid rgba(255,255,255,.12); border-radius: 1rem; background: rgba(255,255,255,.055); padding: .65rem .8rem; color: rgba(236,254,255,.84); font-size: 12px; font-weight: 900; }
      .beatRail span[data-active='true'] { background: rgba(207,250,254,.92); color: #020617; }

      .memoryNav { position: fixed; left: 50%; bottom: 1rem; z-index: 40; display: flex; max-width: calc(100vw - 1.5rem); transform: translateX(-50%); gap: .35rem; overflow-x: auto; border: 1px solid rgba(255,255,255,.12); border-radius: 999px; background: rgba(0,0,0,.52); padding: .42rem; backdrop-filter: blur(18px); }
      .memoryNav a { border: 1px solid rgba(207,250,254,.12); border-radius: 999px; padding: .52rem .82rem; color: rgba(236,254,255,.86); font-size: 11px; font-weight: 950; text-decoration: none; white-space: nowrap; }
      .memoryNav a[data-active='true'] { background: rgba(207,250,254,.95); color: #020617; }

      @keyframes chamberBreath { from { transform: translate(-50%,-50%) scale(.9); opacity: .62; } to { transform: translate(-50%,-50%) scale(1.1); opacity: .88; } }

      @media (max-width: 850px) {
        .memoryStage { grid-template-columns: 1fr; padding: 4.75rem .75rem 9rem; align-items: start; }
        .memoryTitle { max-width: 330px; padding: .9rem; }
        .memoryTitle h1 { font-size: 2.6rem; }
        .memoryPanel { margin-top: min(33vh, 240px); }
        .memoryCard { min-height: 230px; }
        .orbEcho { display: none; }
        .memoryNav { width: calc(100vw - 1rem); justify-content: flex-start; bottom: .75rem; }
      }

      @media (prefers-reduced-motion: reduce) {
        .memoryStarCore .halo { animation: none; }
      }
    `}</style>
  )
}

export function FinalFocusChamber() {
  return (
    <main className="memorySurface" style={routeStyle(assetCssStack(focusAssets.primary))} data-testid="urai-final-focus-chamber" data-route-polish="selected-memory-camera-chamber" data-canon="camera-from-life-map-no-avatar-orb">
      <GalaxyField />
      <span className="orbEcho" aria-hidden="true" />
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
          <div className="memoryCard" aria-label="The Quiet Reset selected memory image"><MemoryStar /></div>
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
  return (
    <main className="memorySurface" style={routeStyle(assetCssStack(replayAssets.primary))} data-testid="urai-final-replay-film" data-route-polish="cinematic-memory-camera-film" data-canon="camera-from-focus-no-avatar-orb">
      <GalaxyField />
      <span className="orbEcho" aria-hidden="true" />
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
          <div className="memoryCard" aria-label="The Quiet Reset cinematic replay"><MemoryStar /></div>
          <p>Replay thread active</p>
          <h2>The Quiet Reset</h2>
          <span>The memory opens as atmosphere, rhythm, and return path — not a static poster.</span>
          <div className="beatRail" aria-label="Film beats">
            {replayBeats.map((beat, index) => <span key={beat} data-active={index === 2 ? 'true' : 'false'}>{index + 1}. {beat}</span>)}
          </div>
        </aside>
      </section>
      <RouteRail active="Replay" />
      <SharedStyles />
    </main>
  )
}

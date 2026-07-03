import Link from 'next/link'
import type { CSSProperties } from 'react'
import { avatarAssets, mirrorAssets, uiAssets } from '@/spatial/assets/uraiAssets'

const patterns = [
  {
    title: 'Pressure repeats before rest',
    signal: 'Body · schedule · unfinished decisions',
    detail: 'Mirror notices the sequence without turning it into a verdict. You choose whether it becomes a Focus thread.',
  },
  {
    title: 'Certain places soften the signal',
    signal: 'Location · rhythm · recovery',
    detail: 'Protected place context can reveal what supports you without exposing private location history.',
  },
  {
    title: 'Creation returns after quiet',
    signal: 'Memory · energy · becoming',
    detail: 'A recurring return to making can be held as a pattern, not a productivity score.',
  },
] as const

type MirrorStyle = CSSProperties & {
  '--mirror-world'?: string
  '--mirror-pattern'?: string
  '--mirror-guide'?: string
  '--mirror-orb'?: string
}

const mirrorStyle: MirrorStyle = {
  '--mirror-world': `url("${mirrorAssets.primary.src}")`,
  '--mirror-pattern': `url("${mirrorAssets.accents.pattern.src}")`,
  '--mirror-guide': `url("${avatarAssets.mirror.src}")`,
  '--mirror-orb': `url("${uiAssets.orbActive.src}")`,
}

export default function MirrorRoutePage() {
  return (
    <main
      className="mirrorRealm"
      style={mirrorStyle}
      data-testid="urai-final-mirror-realm"
      data-route-polish="embodied-private-reflection-realm"
      data-mirror-guide-art="provider-final"
      aria-label="URAI private Mirror reflection realm"
    >
      <div className="mirrorWorld" aria-hidden="true" />
      <div className="mirrorVeil" aria-hidden="true" />

      <header className="mirrorHeader">
        <span>URAI MIRROR</span>
        <small>Private reflection · no judgment · user controlled</small>
      </header>

      <section className="mirrorIntro" aria-labelledby="mirror-title">
        <p>REFLECTION REALM</p>
        <h1 id="mirror-title">See the pattern. Keep your authority.</h1>
        <span>
          Mirror places repeating signals inside a quiet chamber. It does not diagnose,
          rank, or judge. It gives you a clearer view and safe paths back into your life.
        </span>
        <div className="mirrorActions">
          <Link href="/focus?memoryId=quiet-reset">Open selected Focus</Link>
          <Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread">Enter Replay</Link>
        </div>
      </section>

      <section className="reflectionStage" aria-label="Living Mirror chamber">
        <div className="reflectionHalo haloOuter" aria-hidden="true" />
        <div className="reflectionHalo haloInner" aria-hidden="true" />
        <div className="patternGlyph" aria-hidden="true" />
        <div className="orbReflection" role="img" aria-label="Orb reflection companion present in Mirror" />
        <div className="mirrorGuide" role="img" aria-label="Mirror Guide private workforce presence">
          <i aria-hidden="true" />
          <span>Mirror Guide</span>
        </div>
        <div className="reflectionStatement">
          <strong>Mirror does not judge.</strong>
          <span>It shows relationships between signals while uncertainty remains visible.</span>
        </div>
      </section>

      <aside className="patternDock" aria-label="Private pattern lenses">
        <p>THREE SIGNAL LENSES</p>
        {patterns.map((pattern, index) => (
          <details key={pattern.title} open={index === 0}>
            <summary>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{pattern.title}</strong>
              <small>{pattern.signal}</small>
            </summary>
            <p>{pattern.detail}</p>
          </details>
        ))}
        <Link className="passportLink" href="/passport">Review consent and ownership</Link>
      </aside>

      <nav className="mirrorNav" aria-label="URAI launch route chain">
        {[
          ['Home', '/home'],
          ['Ground', '/ground'],
          ['Life Map', '/life-map'],
          ['Focus', '/focus'],
          ['Replay', '/replay'],
          ['Mirror', '/mirror'],
          ['Passport', '/passport'],
        ].map(([label, href]) => (
          <Link key={href} href={href} data-active={href === '/mirror' ? 'true' : 'false'}>
            {label}
          </Link>
        ))}
      </nav>

      <style>{`
        .mirrorRealm {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          color: #f7fbff;
          background: #020611;
          isolation: isolate;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .mirrorWorld,
        .mirrorVeil {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .mirrorWorld {
          z-index: -3;
          background-image:
            linear-gradient(90deg, rgba(1,5,14,.9) 0%, rgba(1,5,14,.48) 38%, rgba(1,5,14,.16) 62%, rgba(1,5,14,.76) 100%),
            linear-gradient(180deg, rgba(1,5,14,.08), rgba(1,5,14,.78)),
            var(--mirror-world);
          background-size: cover;
          background-position: center;
          filter: saturate(1.12) contrast(1.08) brightness(.84);
          transform: scale(1.02);
        }
        .mirrorVeil {
          z-index: -2;
          background:
            radial-gradient(circle at 58% 40%, rgba(157,235,255,.16), transparent 26%),
            radial-gradient(circle at 76% 72%, rgba(244,205,126,.12), transparent 25%),
            radial-gradient(ellipse at center, transparent 0 38%, rgba(0,0,0,.72) 88%);
        }
        .mirrorHeader {
          position: relative;
          z-index: 20;
          display: flex;
          width: fit-content;
          align-items: center;
          gap: .8rem;
          margin: 1rem;
          padding: .65rem .9rem;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 999px;
          background: rgba(2,8,18,.62);
          box-shadow: 0 18px 60px rgba(0,0,0,.28);
          backdrop-filter: blur(18px);
        }
        .mirrorHeader span { font-size: .68rem; font-weight: 950; letter-spacing: .28em; }
        .mirrorHeader small { color: rgba(227,245,255,.62); font-size: .68rem; font-weight: 750; }
        .mirrorIntro {
          position: absolute;
          left: clamp(20px, 4vw, 62px);
          top: 50%;
          z-index: 14;
          width: min(500px, 36vw);
          padding: clamp(22px, 2.5vw, 34px);
          border: 1px solid rgba(218,246,255,.14);
          border-radius: 32px;
          background: linear-gradient(145deg, rgba(2,8,20,.82), rgba(4,12,26,.48));
          box-shadow: 0 34px 120px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.08);
          transform: translateY(-50%);
          backdrop-filter: blur(22px) saturate(1.08);
        }
        .mirrorIntro > p,
        .patternDock > p {
          margin: 0;
          color: #bff6ff;
          font-size: .64rem;
          font-weight: 950;
          letter-spacing: .24em;
        }
        .mirrorIntro h1 {
          max-width: 9ch;
          margin: .55rem 0 .9rem;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(3.4rem, 6.5vw, 7.5rem);
          font-weight: 500;
          line-height: .84;
          letter-spacing: -.07em;
          text-wrap: balance;
          text-shadow: 0 24px 70px rgba(0,0,0,.58);
        }
        .mirrorIntro > span {
          display: block;
          max-width: 43ch;
          color: rgba(238,248,255,.76);
          font-size: .94rem;
          font-weight: 650;
          line-height: 1.62;
        }
        .mirrorActions { display: flex; flex-wrap: wrap; gap: .55rem; margin-top: 1.1rem; }
        .mirrorActions a,
        .passportLink {
          display: inline-flex;
          min-height: 40px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          padding: 0 .95rem;
          color: white;
          background: rgba(255,255,255,.055);
          font-size: .72rem;
          font-weight: 900;
          text-decoration: none;
        }
        .mirrorActions a:first-child { color: #031019; background: rgba(211,250,255,.96); }
        .reflectionStage {
          position: absolute;
          left: 50%;
          top: 8%;
          bottom: 8%;
          z-index: 8;
          width: min(44vw, 680px);
          transform: translateX(-38%);
        }
        .reflectionHalo {
          position: absolute;
          left: 50%;
          top: 48%;
          border: 1px solid rgba(202,245,255,.20);
          border-radius: 50%;
          box-shadow: inset 0 0 70px rgba(129,228,255,.08), 0 0 90px rgba(94,220,255,.10);
          transform: translate(-50%,-50%);
        }
        .haloOuter { width: min(38vw, 560px); aspect-ratio: 1; }
        .haloInner { width: min(27vw, 390px); aspect-ratio: 1; border-color: rgba(247,211,142,.20); }
        .patternGlyph {
          position: absolute;
          left: 50%;
          top: 48%;
          width: min(29vw, 430px);
          aspect-ratio: 1;
          background-image: var(--mirror-pattern);
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          filter: drop-shadow(0 0 42px rgba(120,230,255,.22));
          opacity: .82;
          transform: translate(-50%,-50%);
        }
        .orbReflection {
          position: absolute;
          left: 50%;
          top: 48%;
          z-index: 5;
          width: clamp(92px, 9vw, 142px);
          aspect-ratio: 1;
          border: 1px solid rgba(221,249,255,.28);
          border-radius: 50%;
          background-image: var(--mirror-orb);
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;
          box-shadow: 0 0 70px rgba(106,225,255,.46), 0 0 150px rgba(188,132,255,.20);
          transform: translate(-50%,-50%);
        }
        .mirrorGuide {
          position: absolute;
          right: -4%;
          bottom: 2%;
          z-index: 7;
          display: grid;
          justify-items: center;
          gap: .35rem;
        }
        .mirrorGuide i {
          width: clamp(118px, 13vw, 210px);
          height: clamp(190px, 22vw, 340px);
          background-image: var(--mirror-guide);
          background-repeat: no-repeat;
          background-position: center bottom;
          background-size: contain;
          filter: drop-shadow(0 26px 28px rgba(0,0,0,.56)) drop-shadow(0 0 36px rgba(121,232,255,.18));
        }
        .mirrorGuide span {
          padding: .42rem .7rem;
          border: 1px solid rgba(216,249,255,.16);
          border-radius: 999px;
          background: rgba(0,0,0,.62);
          font-size: .62rem;
          font-weight: 900;
          backdrop-filter: blur(12px);
        }
        .reflectionStatement {
          position: absolute;
          left: 50%;
          bottom: 3%;
          z-index: 9;
          width: min(360px, 72%);
          padding: .85rem 1rem;
          border: 1px solid rgba(216,249,255,.14);
          border-radius: 1.2rem;
          background: rgba(2,8,18,.66);
          box-shadow: 0 20px 60px rgba(0,0,0,.28);
          transform: translateX(-50%);
          backdrop-filter: blur(16px);
        }
        .reflectionStatement strong,
        .reflectionStatement span { display: block; }
        .reflectionStatement strong { font-size: .86rem; }
        .reflectionStatement span { margin-top: .25rem; color: rgba(232,247,255,.66); font-size: .68rem; line-height: 1.45; }
        .patternDock {
          position: absolute;
          right: clamp(18px, 3vw, 46px);
          top: 50%;
          z-index: 15;
          width: min(360px, 27vw);
          padding: 1rem;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 26px;
          background: rgba(2,8,18,.72);
          box-shadow: 0 28px 100px rgba(0,0,0,.38);
          transform: translateY(-50%);
          backdrop-filter: blur(20px);
        }
        .patternDock details { margin-top: .55rem; border: 1px solid rgba(255,255,255,.10); border-radius: 1rem; background: rgba(255,255,255,.04); padding: .75rem; }
        .patternDock summary { display: grid; grid-template-columns: auto 1fr; gap: .16rem .55rem; list-style: none; cursor: pointer; }
        .patternDock summary::-webkit-details-marker { display: none; }
        .patternDock summary > span { grid-row: 1 / 3; align-self: center; color: #bff6ff; font-size: .62rem; font-weight: 950; }
        .patternDock summary strong { font-size: .78rem; line-height: 1.3; }
        .patternDock summary small { color: rgba(228,245,255,.58); font-size: .58rem; line-height: 1.35; }
        .patternDock details > p { margin: .6rem 0 0; color: rgba(232,247,255,.72); font-size: .7rem; line-height: 1.5; }
        .passportLink { width: 100%; box-sizing: border-box; margin-top: .7rem; color: #081018; background: rgba(247,218,158,.94); }
        .mirrorNav {
          position: fixed;
          left: 50%;
          bottom: 1rem;
          z-index: 40;
          display: flex;
          max-width: calc(100vw - 1.5rem);
          gap: .3rem;
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 999px;
          background: rgba(0,0,0,.62);
          padding: .4rem;
          transform: translateX(-50%);
          backdrop-filter: blur(18px);
        }
        .mirrorNav a { padding: .52rem .78rem; border-radius: 999px; color: rgba(239,250,255,.76); font-size: .64rem; font-weight: 950; text-decoration: none; white-space: nowrap; }
        .mirrorNav a[data-active='true'] { color: #041018; background: rgba(214,250,255,.96); }
        @media (max-width: 1100px) {
          .mirrorIntro { width: min(430px, 39vw); }
          .reflectionStage { left: 51%; width: 42vw; }
          .patternDock { width: min(300px, 26vw); }
          .mirrorGuide { right: -8%; }
        }
        @media (max-width: 760px) {
          .mirrorRealm { min-height: auto; overflow-y: auto; padding-bottom: 8rem; }
          .mirrorWorld {
            position: fixed;
            background-image:
              linear-gradient(180deg, rgba(1,5,14,.28), rgba(1,5,14,.62) 44%, rgba(1,5,14,.94) 100%),
              url('${mirrorAssets.mobile.src}');
            background-position: center top;
          }
          .mirrorHeader { margin: .7rem; }
          .mirrorHeader small { display: none; }
          .mirrorIntro,
          .reflectionStage,
          .patternDock {
            position: relative;
            inset: auto;
            width: auto;
            transform: none;
          }
          .mirrorIntro { margin: 1rem .7rem 0; padding: 1.15rem; border-radius: 26px; }
          .mirrorIntro h1 { max-width: 9ch; font-size: clamp(3.3rem, 15vw, 5rem); line-height: .9; }
          .reflectionStage { min-height: 62svh; margin: .8rem .7rem 0; overflow: hidden; border: 1px solid rgba(216,249,255,.12); border-radius: 28px; background: rgba(2,8,18,.36); }
          .haloOuter { width: min(84vw, 430px); }
          .haloInner { width: min(61vw, 310px); }
          .patternGlyph { width: min(68vw, 340px); }
          .orbReflection { width: 108px; }
          .mirrorGuide { right: -3%; bottom: 4%; }
          .mirrorGuide i { width: 120px; height: 198px; }
          .mirrorGuide span { display: none; }
          .reflectionStatement { left: .8rem; right: .8rem; bottom: .8rem; width: auto; transform: none; }
          .patternDock { margin: .8rem .7rem 0; padding: .9rem; }
          .mirrorNav { bottom: .55rem; width: calc(100vw - 1rem); box-sizing: border-box; justify-content: flex-start; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mirrorWorld,
          .patternGlyph,
          .orbReflection,
          .mirrorGuide i { transition: none; animation: none; }
        }
      `}</style>
    </main>
  )
}

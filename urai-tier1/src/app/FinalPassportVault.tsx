import Link from 'next/link'
import type { CSSProperties } from 'react'
import { passportAssets } from '@/spatial/assets/uraiAssets'

const vaultLayers = [
  {
    label: 'IDENTITY',
    title: 'Owner key',
    copy: 'Your private profile, devices, and world ownership remain attached to you—not an advertiser or model provider.',
  },
  {
    label: 'CONSENT',
    title: 'Permission chamber',
    copy: 'Sharing, model access, location precision, and route access stay explicit, inspectable choices.',
  },
  {
    label: 'PROVENANCE',
    title: 'Source archive',
    copy: 'Memories, generated surfaces, edits, and route history retain visible origin and confidence boundaries.',
  },
  {
    label: 'PORTABILITY',
    title: 'Exit controls',
    copy: 'Review, export, revoke, and delete remain available before and after any permission is granted.',
  },
] as const

type PassportStyle = CSSProperties & {
  '--passport-world'?: string
  '--passport-mobile'?: string
  '--passport-seal'?: string
}

const passportStyle: PassportStyle = {
  '--passport-world': `url("${passportAssets.primary.src}")`,
  '--passport-mobile': `url("${passportAssets.mobile.src}")`,
  '--passport-seal': `url("${passportAssets.accents.ownershipSeal.src}")`,
}

export default function FinalPassportVault() {
  return (
    <main
      className="passportRealm"
      style={passportStyle}
      data-testid="urai-final-passport-vault"
      data-route-polish="embodied-identity-consent-vault"
      data-ownership-seal-art="provider-final"
      aria-label="URAI Passport private ownership vault"
    >
      <div className="passportWorld" aria-hidden="true" />
      <div className="passportVeil" aria-hidden="true" />

      <header className="passportHeader">
        <span>URAI PASSPORT</span>
        <small>Private by default · owned by you</small>
      </header>

      <section className="passportIntro" aria-labelledby="passport-title">
        <p>IDENTITY · CONSENT · OWNERSHIP</p>
        <h1 id="passport-title">Your life stays yours.</h1>
        <span>
          Passport is the ownership layer for your identity, permissions, provenance,
          exports, deletion, and every doorway into your private world.
        </span>
        <div className="passportActions">
          <Link href="/privacy-controls">Open Privacy Controls</Link>
          <Link href="/status">View system status</Link>
        </div>
      </section>

      <section className="vaultStage" aria-label="Private identity vault chamber">
        <div className="vaultDoor" aria-hidden="true">
          <span className="vaultRing ringOne" />
          <span className="vaultRing ringTwo" />
          <span className="vaultRing ringThree" />
          <span className="ownershipSeal" />
        </div>
        <div className="ownershipStatement">
          <strong>Ownership key active</strong>
          <span>Identity and consent remain private until you make a deliberate choice.</span>
        </div>
      </section>

      <aside className="vaultConsole" aria-label="Passport ownership controls">
        <p>VAULT LAYERS</p>
        {vaultLayers.map((layer, index) => (
          <details key={layer.title} open={index === 0}>
            <summary>
              <span>{layer.label}</span>
              <strong>{layer.title}</strong>
              <small>{String(index + 1).padStart(2, '0')}</small>
            </summary>
            <p>{layer.copy}</p>
          </details>
        ))}
        <div className="vaultControlRail" aria-label="Ownership action paths">
          <Link href="/privacy-controls">Review permissions</Link>
          <Link href="/privacy-controls#export">Export</Link>
          <Link href="/privacy-controls#delete">Delete</Link>
        </div>
      </aside>

      <nav className="passportNav" aria-label="URAI passport route chain">
        {[
          ['Home', '/home'],
          ['Ground', '/ground'],
          ['Life Map', '/life-map'],
          ['Replay', '/replay'],
          ['Mirror', '/mirror'],
          ['Passport', '/passport'],
          ['Privacy', '/privacy-controls'],
          ['Status', '/status'],
        ].map(([label, href]) => (
          <Link key={href} href={href} data-active={href === '/passport' ? 'true' : 'false'}>
            {label}
          </Link>
        ))}
      </nav>

      <style>{`
        .passportRealm {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          color: #fffaf0;
          background: #04050a;
          isolation: isolate;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .passportWorld,
        .passportVeil {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .passportWorld {
          z-index: -3;
          background-image:
            linear-gradient(90deg, rgba(3,4,10,.93) 0%, rgba(3,4,10,.58) 38%, rgba(3,4,10,.14) 62%, rgba(3,4,10,.76) 100%),
            linear-gradient(180deg, rgba(3,4,10,.08), rgba(3,4,10,.78)),
            var(--passport-world);
          background-position: center;
          background-size: cover;
          filter: saturate(1.08) contrast(1.08) brightness(.86);
          transform: scale(1.02);
        }
        .passportVeil {
          z-index: -2;
          background:
            radial-gradient(circle at 60% 42%, rgba(255,225,165,.18), transparent 28%),
            radial-gradient(circle at 76% 72%, rgba(126,231,255,.12), transparent 26%),
            radial-gradient(ellipse at center, transparent 0 40%, rgba(0,0,0,.74) 90%);
        }
        .passportHeader {
          position: relative;
          z-index: 20;
          display: flex;
          width: fit-content;
          align-items: center;
          gap: .8rem;
          margin: 1rem;
          padding: .66rem .92rem;
          border: 1px solid rgba(255,236,194,.18);
          border-radius: 999px;
          background: rgba(8,8,12,.66);
          box-shadow: 0 18px 60px rgba(0,0,0,.28);
          backdrop-filter: blur(18px);
        }
        .passportHeader span { font-size: .68rem; font-weight: 950; letter-spacing: .28em; }
        .passportHeader small { color: rgba(255,240,210,.62); font-size: .68rem; font-weight: 750; }
        .passportIntro {
          position: absolute;
          left: clamp(20px, 4vw, 62px);
          top: 50%;
          z-index: 14;
          width: min(500px, 36vw);
          padding: clamp(22px, 2.5vw, 34px);
          border: 1px solid rgba(255,235,192,.16);
          border-radius: 32px;
          background: linear-gradient(145deg, rgba(8,8,14,.84), rgba(16,13,16,.50));
          box-shadow: 0 34px 120px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.08);
          transform: translateY(-50%);
          backdrop-filter: blur(22px) saturate(1.08);
        }
        .passportIntro > p,
        .vaultConsole > p {
          margin: 0;
          color: #ffe7b7;
          font-size: .64rem;
          font-weight: 950;
          letter-spacing: .23em;
        }
        .passportIntro h1 {
          max-width: 8.4ch;
          margin: .55rem 0 .9rem;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(3.5rem, 6.7vw, 7.7rem);
          font-weight: 500;
          line-height: .84;
          letter-spacing: -.07em;
          text-wrap: balance;
          text-shadow: 0 24px 70px rgba(0,0,0,.58);
        }
        .passportIntro > span {
          display: block;
          max-width: 43ch;
          color: rgba(255,248,236,.76);
          font-size: .94rem;
          font-weight: 650;
          line-height: 1.62;
        }
        .passportActions { display: flex; flex-wrap: wrap; gap: .55rem; margin-top: 1.1rem; }
        .passportActions a,
        .vaultControlRail a {
          display: inline-flex;
          min-height: 40px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 999px;
          padding: 0 .95rem;
          color: white;
          background: rgba(255,255,255,.055);
          font-size: .72rem;
          font-weight: 900;
          text-decoration: none;
        }
        .passportActions a:first-child { color: #111015; background: rgba(255,232,181,.97); }
        .vaultStage {
          position: absolute;
          left: 54%;
          top: 8%;
          bottom: 8%;
          z-index: 8;
          width: min(39vw, 620px);
          transform: translateX(-36%);
        }
        .vaultDoor {
          position: absolute;
          left: 50%;
          top: 47%;
          width: min(36vw, 540px);
          aspect-ratio: 1;
          border: 1px solid rgba(255,232,184,.22);
          border-radius: 50%;
          background:
            radial-gradient(circle, rgba(255,255,255,.08), transparent 42%),
            linear-gradient(145deg, rgba(14,13,18,.82), rgba(8,11,16,.92));
          box-shadow: inset 0 0 90px rgba(255,224,163,.08), 0 40px 120px rgba(0,0,0,.46), 0 0 100px rgba(111,228,255,.08);
          transform: translate(-50%,-50%);
        }
        .vaultDoor::before,
        .vaultDoor::after {
          content: '';
          position: absolute;
          inset: 7%;
          border: 1px solid rgba(255,232,184,.18);
          border-radius: 50%;
        }
        .vaultDoor::after { inset: 17%; border-color: rgba(157,238,255,.15); }
        .vaultRing {
          position: absolute;
          left: 50%;
          top: 50%;
          border: 1px solid rgba(255,233,190,.22);
          border-radius: 50%;
          transform: translate(-50%,-50%);
        }
        .ringOne { width: 76%; aspect-ratio: 1; }
        .ringTwo { width: 56%; aspect-ratio: 1; border-color: rgba(151,235,255,.18); }
        .ringThree { width: 35%; aspect-ratio: 1; }
        .ownershipSeal {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 42%;
          aspect-ratio: 1;
          background-image: var(--passport-seal);
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          filter: drop-shadow(0 0 46px rgba(255,224,157,.32)) drop-shadow(0 0 88px rgba(108,226,255,.15));
          transform: translate(-50%,-50%);
        }
        .ownershipStatement {
          position: absolute;
          left: 50%;
          bottom: 3%;
          z-index: 5;
          width: min(360px, 78%);
          padding: .85rem 1rem;
          border: 1px solid rgba(255,234,192,.15);
          border-radius: 1.2rem;
          background: rgba(8,8,13,.72);
          box-shadow: 0 20px 60px rgba(0,0,0,.30);
          transform: translateX(-50%);
          backdrop-filter: blur(16px);
        }
        .ownershipStatement strong,
        .ownershipStatement span { display: block; }
        .ownershipStatement strong { font-size: .86rem; }
        .ownershipStatement span { margin-top: .25rem; color: rgba(255,246,226,.66); font-size: .68rem; line-height: 1.45; }
        .vaultConsole {
          position: absolute;
          right: clamp(18px, 3vw, 46px);
          top: 50%;
          z-index: 15;
          width: min(370px, 27vw);
          padding: 1rem;
          border: 1px solid rgba(255,235,192,.14);
          border-radius: 26px;
          background: rgba(8,8,13,.74);
          box-shadow: 0 28px 100px rgba(0,0,0,.40);
          transform: translateY(-50%);
          backdrop-filter: blur(20px);
        }
        .vaultConsole details { margin-top: .55rem; border: 1px solid rgba(255,255,255,.10); border-radius: 1rem; background: rgba(255,255,255,.04); padding: .75rem; }
        .vaultConsole summary { display: grid; grid-template-columns: 1fr auto; gap: .14rem .6rem; list-style: none; cursor: pointer; }
        .vaultConsole summary::-webkit-details-marker { display: none; }
        .vaultConsole summary > span { color: #ffe5af; font-size: .54rem; font-weight: 950; letter-spacing: .16em; }
        .vaultConsole summary strong { grid-column: 1; font-size: .8rem; }
        .vaultConsole summary small { grid-column: 2; grid-row: 1 / 3; align-self: center; color: rgba(172,239,255,.72); font-size: .62rem; font-weight: 900; }
        .vaultConsole details > p { margin: .6rem 0 0; color: rgba(255,247,231,.70); font-size: .7rem; line-height: 1.5; }
        .vaultControlRail { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .35rem; margin-top: .7rem; }
        .vaultControlRail a { min-height: 36px; padding: 0 .5rem; font-size: .58rem; }
        .vaultControlRail a:first-child { grid-column: 1 / -1; color: #131016; background: rgba(255,232,181,.96); }
        .passportNav {
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
          background: rgba(0,0,0,.64);
          padding: .4rem;
          transform: translateX(-50%);
          backdrop-filter: blur(18px);
        }
        .passportNav a { padding: .52rem .78rem; border-radius: 999px; color: rgba(255,248,236,.76); font-size: .64rem; font-weight: 950; text-decoration: none; white-space: nowrap; }
        .passportNav a[data-active='true'] { color: #141015; background: rgba(255,232,181,.97); }
        @media (max-width: 1100px) {
          .passportIntro { width: min(430px, 39vw); }
          .vaultStage { width: 38vw; }
          .vaultConsole { width: min(310px, 26vw); }
        }
        @media (max-width: 760px) {
          .passportRealm { min-height: auto; overflow-y: auto; padding-bottom: 8rem; }
          .passportWorld {
            position: fixed;
            background-image:
              linear-gradient(180deg, rgba(3,4,10,.26), rgba(3,4,10,.66) 46%, rgba(3,4,10,.94) 100%),
              var(--passport-mobile);
            background-position: center top;
          }
          .passportHeader { margin: .7rem; }
          .passportHeader small { display: none; }
          .passportIntro,
          .vaultStage,
          .vaultConsole {
            position: relative;
            inset: auto;
            width: auto;
            transform: none;
          }
          .passportIntro { margin: 1rem .7rem 0; padding: 1.15rem; border-radius: 26px; }
          .passportIntro h1 { max-width: 8.5ch; font-size: clamp(3.35rem, 15vw, 5rem); line-height: .9; }
          .vaultStage { min-height: 58svh; margin: .8rem .7rem 0; overflow: hidden; border: 1px solid rgba(255,235,192,.12); border-radius: 28px; background: rgba(8,8,13,.34); }
          .vaultDoor { width: min(82vw, 410px); }
          .ownershipStatement { left: .8rem; right: .8rem; bottom: .8rem; width: auto; transform: none; }
          .vaultConsole { margin: .8rem .7rem 0; padding: .9rem; }
          .passportNav { bottom: .55rem; width: calc(100vw - 1rem); box-sizing: border-box; justify-content: flex-start; }
        }
        @media (prefers-reduced-motion: reduce) {
          .passportWorld,
          .vaultRing,
          .ownershipSeal { transition: none; animation: none; }
        }
      `}</style>
    </main>
  )
}

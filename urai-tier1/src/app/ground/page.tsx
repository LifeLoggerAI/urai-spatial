import type { CSSProperties } from 'react'
import { avatarAssets } from '@/spatial/assets/uraiAssets'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

const stations = [
  {
    tag: 'ENTRY',
    title: 'Reception desk',
    note: 'New items arrive here before anything moves.',
    detail: 'Welcome Guide receives new signals, sorts urgency, and waits for your direction.',
    className: 'station1',
    x: '17%',
    y: '18%',
  },
  {
    tag: 'CONSENT',
    title: 'Privacy sanctuary',
    note: 'Permissions, exports, boundaries, and model access stay visible.',
    detail: 'Privacy Steward protects access, location precision, sharing, export, and deletion boundaries.',
    className: 'station2',
    x: '68%',
    y: '17%',
  },
  {
    tag: 'PRIORITY',
    title: 'Work console',
    note: 'Inbox, files, unfinished decisions, and timing route here first.',
    detail: 'Schedule Steward prepares options and approvals without acting beyond consent.',
    className: 'station3',
    x: '8%',
    y: '55%',
  },
  {
    tag: 'RECOVERY',
    title: 'Wellness corner',
    note: 'Body signal, pressure, rhythm, and focus remain private context.',
    detail: 'Wellness Guide holds a calm recovery lane and never turns your body into a public score.',
    className: 'station4',
    x: '75%',
    y: '53%',
  },
  {
    tag: 'MEANING',
    title: 'Memory archive',
    note: 'Objects connect to places, memories, relationships, and replay.',
    detail: 'Memory Archivist protects source context and prepares Focus and Replay without erasing uncertainty.',
    className: 'station5',
    x: '26%',
    y: '69%',
  },
  {
    tag: 'ERRANDS',
    title: 'Logistics bay',
    note: 'Returns, deliveries, appointments, and home tasks wait for approval.',
    detail: 'Logistics Helper assembles the next practical move and leaves final authority with you.',
    className: 'station6',
    x: '61%',
    y: '70%',
  },
] as const

const helpers = [
  { name: 'Welcome Guide', className: 'helper1', x: '40%', y: '25%', art: avatarAssets.receptionist.src },
  { name: 'Privacy Steward', className: 'helper2', x: '59%', y: '25%', art: avatarAssets.privacySteward.src },
  { name: 'Schedule Steward', className: 'helper3', x: '35%', y: '54%', art: avatarAssets.scheduleSteward.src },
  { name: 'Wellness Guide', className: 'helper4', x: '65%', y: '54%', art: avatarAssets.wellnessGuide.src },
  { name: 'Memory Archivist', className: 'helper5', x: '50%', y: '67%', art: avatarAssets.archivist.src },
] as const

const specialists = [
  { name: 'Relationship Liaison', art: avatarAssets.relationshipLiaison.src },
  { name: 'Operator', art: avatarAssets.operator.src },
  { name: 'Builder', art: avatarAssets.builder.src },
  { name: 'Protector', art: avatarAssets.protector.src },
  { name: 'Mirror Guide', art: avatarAssets.mirror.src },
  { name: 'World Guide', art: avatarAssets.guide.src },
] as const

type ArtPosition = CSSProperties & {
  '--helper-art'?: string
  '--specialist-art'?: string
}

function positioned(x: string, y: string, art?: string): ArtPosition {
  return {
    left: x,
    top: y,
    ...(art ? { '--helper-art': `url("${art}")` } : {}),
  }
}

function specialistArt(art: string): ArtPosition {
  return { '--specialist-art': `url("${art}")` }
}

export default function GroundPage() {
  const scene = getSceneDefinition('ground')

  return (
    <main
      className="groundFinal"
      data-route="ground"
      data-route-polish="walkable-first-person-ground-layer"
      data-launch-surface="premium-embodied-ground-world"
      data-workforce-art="provider-final"
      data-scene-id={scene.id}
      data-camera-preset={scene.cameraPreset}
      data-lighting-preset={scene.lightingPreset}
      data-privacy-level={scene.privacyLevel}
      aria-label="URAI Ground private operations floor"
    >
      <div className="skyGlow" aria-hidden="true" />
      <div className="floorGrid" aria-hidden="true" />
      <div className="depthVignette" aria-hidden="true" />

      <header className="topBar">
        <div className="brand">URAI GROUND</div>
        <div className="mode">Private operations floor · first-person camera</div>
      </header>

      <section className="heroCard" aria-labelledby="ground-title">
        <p className="eyebrow">CAMERA DESCENDED</p>
        <h1 id="ground-title">Your private floor is open.</h1>
        <p>
          Walk the room. Inspect real objects. Approve what helpers prepare.
          Nothing leaves your world without consent.
        </p>
      </section>

      <section className="room" aria-label="Walkable private operations floor">
        <div className="roomBackWall">
          <div className="orbLens" aria-hidden="true" />
          <div className="workforceRoster" aria-label="Specialist council present in Ground">
            <span className="rosterLabel">SPECIALIST COUNCIL</span>
            <div className="specialistRail">
              {specialists.map((specialist) => (
                <div
                  className="specialist"
                  key={specialist.name}
                  role="img"
                  aria-label={`${specialist.name} private workforce avatar`}
                  title={specialist.name}
                >
                  <i style={specialistArt(specialist.art)} aria-hidden="true" />
                  <span>{specialist.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="wallLabel">Private workforce preparing the day</div>
        </div>

        <div className="table tableOne" aria-label="Kitchen table real-life context">
          <span>Kitchen table</span>
        </div>
        <div className="table tableTwo" aria-label="Work surface approval context">
          <span>Work surface</span>
        </div>
        <div className="vault" aria-label="Consent vault">
          <span>Consent vault</span>
        </div>
        <div className="archiveCase" aria-label="Protected memory case">
          <span>Memory case</span>
        </div>

        {stations.map((station) => (
          <details
            className={`station ${station.className}`}
            key={station.title}
            style={positioned(station.x, station.y)}
          >
            <summary>
              <span className="stationTag">{station.tag}</span>
              <strong>{station.title}</strong>
              <small>{station.note}</small>
            </summary>
            <p>{station.detail}</p>
          </details>
        ))}

        {helpers.map((helper) => (
          <div
            className={`helper ${helper.className}`}
            key={helper.name}
            style={positioned(helper.x, helper.y, helper.art)}
            aria-label={`${helper.name} private workforce presence`}
          >
            <i aria-hidden="true" />
            <span>{helper.name}</span>
          </div>
        ))}

        <div className="centerReticle" aria-hidden="true">
          <span />
        </div>
      </section>

      <aside className="rightCard">
        <p className="eyebrow">PRIVATE FLOOR</p>
        <h2>Your workforce is present, not represented by placeholders.</h2>
        <p>
          Reception, privacy, work, wellness, memory, logistics, and the specialist council
          remain visible before anything acts.
        </p>
        <a href="/spatial/ar-vr">Open XR entry</a>
      </aside>

      <aside className="mobileProofTray" aria-label="Mobile Ground World workforce tray">
        <strong>Private workforce awake</strong>
        <span>Reception · consent · work · wellness · memory · logistics · council</span>
      </aside>

      <footer className="navBar" aria-label="URAI route navigation">
        <a href="/home">Home</a>
        <a className="active" href="/ground">Ground</a>
        <a href="/life-map">Life Map</a>
        <a href="/focus?memoryId=quiet-reset">Focus</a>
        <a href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread">Replay</a>
        <a href="/mirror">Mirror</a>
        <a href="/passport">Passport</a>
        <a href="/spatial/ar-vr">XR</a>
      </footer>

      <style>{`
        .groundFinal {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          color: rgba(248, 250, 255, .96);
          background:
            linear-gradient(180deg, rgba(4,11,18,.22), rgba(7,10,13,.72)),
            url('/assets/urai/ground/ground-world-main.webp') center / cover;
          isolation: isolate;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .skyGlow, .floorGrid, .depthVignette { position: absolute; inset: 0; pointer-events: none; }
        .skyGlow { background: radial-gradient(circle at 50% 12%, rgba(114,225,255,.18), transparent 34%); }
        .floorGrid {
          left: -18vw;
          right: -18vw;
          top: auto;
          bottom: -9svh;
          height: 53svh;
          background:
            repeating-linear-gradient(90deg, rgba(255,255,255,.10) 0 1px, transparent 1px 88px),
            repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0 1px, transparent 1px 54px),
            radial-gradient(ellipse at 50% 0%, rgba(101,180,255,.28), transparent 58%);
          transform: perspective(900px) rotateX(61deg);
          transform-origin: 50% 0;
          opacity: .58;
        }
        .depthVignette { z-index: 3; background: radial-gradient(circle at 50% 50%, transparent 0 42%, rgba(0,0,0,.72) 100%); }
        .topBar { position: relative; z-index: 18; display: flex; width: fit-content; gap: .8rem; margin: 1rem; padding: .7rem 1rem; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: rgba(2,8,14,.72); backdrop-filter: blur(18px); }
        .brand { font-size: .72rem; font-weight: 950; letter-spacing: .3em; }
        .mode { font-size: .76rem; font-weight: 800; opacity: .65; }
        .heroCard, .rightCard { position: absolute; z-index: 18; width: min(370px, 31vw); padding: 1.2rem; border: 1px solid rgba(255,255,255,.14); border-radius: 1.5rem; background: rgba(3,9,15,.72); box-shadow: 0 24px 80px rgba(0,0,0,.34); backdrop-filter: blur(20px); }
        .heroCard { left: 3vw; bottom: 7rem; }
        .rightCard { right: 3vw; bottom: 7rem; }
        .eyebrow { margin: 0 0 .45rem; color: #f3d99d; font-size: .64rem; font-weight: 950; letter-spacing: .22em; }
        .heroCard h1 { margin: 0 0 .8rem; font-size: clamp(2.8rem, 5.4vw, 5.8rem); line-height: .82; letter-spacing: -.075em; }
        .heroCard p, .rightCard p { color: rgba(246,249,255,.78); line-height: 1.5; }
        .rightCard h2 { margin: .35rem 0 .7rem; font-size: clamp(1.5rem, 2.5vw, 2.2rem); }
        .rightCard a { display: inline-flex; margin-top: .9rem; color: white; font-weight: 900; }
        .room { position: absolute; z-index: 4; inset: 5rem 3vw 5.8rem; perspective: 1400px; }
        .roomBackWall {
          position: absolute;
          left: 50%;
          top: 2%;
          width: min(760px, 56vw);
          height: min(420px, 46svh);
          transform: translateX(-50%);
          border: 1px solid rgba(205,244,255,.18);
          border-radius: 2rem;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(2,9,16,.16), rgba(2,9,16,.84)),
            url('/assets/urai/ground/ground-reception.webp') center / cover;
          box-shadow: 0 30px 110px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.08);
        }
        .roomBackWall::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 50% 42%, rgba(139,239,255,.14), transparent 32%); }
        .orbLens { position: absolute; left: 50%; top: 35%; z-index: 5; width: 94px; height: 94px; transform: translate(-50%,-50%); border-radius: 50%; background: radial-gradient(circle, white 0 6%, #9ff7ff 10%, rgba(103,232,249,.18) 38%, transparent 70%); box-shadow: 0 0 80px rgba(103,232,249,.45); }
        .wallLabel { position: absolute; left: 1rem; bottom: 1rem; z-index: 7; padding: .55rem .75rem; border-radius: .8rem; background: rgba(0,0,0,.64); font-size: .7rem; font-weight: 900; }
        .workforceRoster { position: absolute; right: .8rem; bottom: .75rem; left: .8rem; z-index: 6; display: grid; gap: .35rem; }
        .rosterLabel { justify-self: end; color: rgba(207,250,254,.72); font-size: .52rem; font-weight: 950; letter-spacing: .2em; }
        .specialistRail { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); align-items: end; gap: .35rem; padding: .45rem .55rem; border: 1px solid rgba(207,250,254,.12); border-radius: 1.2rem; background: rgba(1,7,13,.46); backdrop-filter: blur(12px); }
        .specialist { min-width: 0; display: grid; justify-items: center; gap: .18rem; }
        .specialist i { width: clamp(42px, 4.3vw, 68px); height: clamp(62px, 6.6vw, 102px); background-image: var(--specialist-art); background-repeat: no-repeat; background-position: center bottom; background-size: contain; filter: drop-shadow(0 10px 16px rgba(0,0,0,.48)) drop-shadow(0 0 18px rgba(111,231,255,.18)); }
        .specialist span { max-width: 100%; overflow: hidden; color: rgba(239,252,255,.76); font-size: .48rem; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
        .station { position: absolute; z-index: 11; width: 190px; padding: .75rem; border: 1px solid rgba(255,255,255,.14); border-radius: 1.15rem; background: rgba(3,10,17,.74); color: white; backdrop-filter: blur(16px); }
        .station summary { list-style: none; cursor: pointer; }
        .station summary::-webkit-details-marker { display: none; }
        .stationTag { display: block; color: #f3d99d; font-size: .56rem; font-weight: 950; letter-spacing: .18em; }
        .station strong, .station small { display: block; }
        .station strong { margin-top: .22rem; font-size: .92rem; }
        .station small { margin-top: .3rem; color: rgba(245,250,255,.62); font-size: .65rem; line-height: 1.35; }
        .station > p { margin: .65rem 0 0; color: rgba(235,250,255,.78); font-size: .72rem; line-height: 1.42; }
        .helper { position: absolute; z-index: 10; display: grid; justify-items: center; gap: .18rem; transform: translate(-50%,-50%); }
        .helper i { width: clamp(58px, 5.2vw, 88px); height: clamp(92px, 8.5vw, 138px); background-image: var(--helper-art); background-repeat: no-repeat; background-position: center bottom; background-size: contain; filter: drop-shadow(0 14px 20px rgba(0,0,0,.52)) drop-shadow(0 0 22px rgba(103,232,249,.24)); }
        .helper span { padding: .3rem .48rem; border: 1px solid rgba(207,250,254,.12); border-radius: 999px; background: rgba(0,0,0,.66); font-size: .56rem; font-weight: 900; white-space: nowrap; backdrop-filter: blur(10px); }
        .table, .vault, .archiveCase { position: absolute; z-index: 7; border: 1px solid rgba(255,255,255,.12); background: rgba(7,14,18,.54); color: rgba(255,255,255,.62); font-size: .6rem; font-weight: 900; }
        .table { width: 180px; height: 54px; border-radius: 50%; transform: perspective(500px) rotateX(60deg); }
        .tableOne { left: 30%; top: 43%; }
        .tableTwo { right: 27%; top: 42%; }
        .vault { right: 8%; top: 32%; width: 88px; height: 116px; border-radius: 1rem; display: grid; place-items: end center; padding-bottom: .5rem; }
        .archiveCase { left: 9%; top: 34%; width: 105px; height: 90px; border-radius: 1rem; display: grid; place-items: end center; padding-bottom: .5rem; }
        .centerReticle { position: absolute; left: 50%; top: 50%; z-index: 14; width: 30px; height: 30px; transform: translate(-50%,-50%); border: 1px solid rgba(255,255,255,.32); border-radius: 50%; }
        .centerReticle span { position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; transform: translate(-50%,-50%); border-radius: 50%; background: white; box-shadow: 0 0 14px #9ff7ff; }
        .mobileProofTray { display: none; }
        .navBar { position: fixed; left: 50%; bottom: 1rem; z-index: 80; display: flex; max-width: calc(100vw - 1rem); gap: .35rem; padding: .4rem; overflow-x: auto; transform: translateX(-50%); border: 1px solid rgba(255,255,255,.12); border-radius: 999px; background: rgba(0,0,0,.64); backdrop-filter: blur(18px); }
        .navBar a { padding: .5rem .75rem; border-radius: 999px; color: rgba(245,250,255,.78); text-decoration: none; font-size: .68rem; font-weight: 950; white-space: nowrap; }
        .navBar a.active { background: rgba(225,251,255,.94); color: #020617; }
        @media (max-width: 980px) {
          .station { width: 150px; }
          .helper i { width: 58px; height: 92px; }
          .helper span { font-size: .48rem; }
          .specialist span { display: none; }
        }
        @media (max-width: 760px) {
          .groundFinal {
            overflow-y: auto;
            background:
              linear-gradient(180deg, rgba(4,11,18,.16), rgba(7,10,13,.78)),
              url('/assets/urai/ground/ground-world-mobile.webp') center top / cover fixed;
          }
          .mode { display: none; }
          .room { inset: 4rem .5rem 13rem; }
          .roomBackWall { width: calc(100vw - 1rem); height: 40svh; }
          .orbLens { top: 31%; width: 74px; height: 74px; }
          .workforceRoster { right: .45rem; bottom: .45rem; left: .45rem; }
          .rosterLabel { display: none; }
          .specialistRail { gap: .1rem; padding: .3rem; }
          .specialist i { width: min(13vw, 48px); height: min(20vw, 72px); }
          .station, .table, .vault, .archiveCase { opacity: .24; pointer-events: none; }
          .helper { opacity: .58; pointer-events: none; }
          .helper i { width: 42px; height: 68px; }
          .helper span { display: none; }
          .heroCard, .rightCard { position: relative; left: auto; right: auto; bottom: auto; width: auto; margin: 49svh .55rem 0; }
          .heroCard h1 { font-size: clamp(2.7rem, 13vw, 4rem); line-height: .9; }
          .rightCard { margin-top: .65rem; margin-bottom: 11rem; }
          .mobileProofTray { position: fixed; left: .55rem; right: .55rem; bottom: 4.9rem; z-index: 70; display: grid; gap: .2rem; padding: .7rem .85rem; border: 1px solid rgba(255,255,255,.14); border-radius: 1rem; background: rgba(2,8,14,.82); backdrop-filter: blur(18px); }
          .mobileProofTray strong { font-size: .7rem; }
          .mobileProofTray span { color: rgba(235,250,255,.62); font-size: .62rem; }
          .navBar { bottom: .55rem; width: calc(100vw - 1.1rem); justify-content: flex-start; }
        }
        @media (prefers-reduced-motion: reduce) {
          .helper i, .specialist i { transition: none; }
        }
      `}</style>
    </main>
  )
}

import type { CSSProperties } from 'react'
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
  { name: 'Welcome Guide', className: 'helper1', x: '40%', y: '24%' },
  { name: 'Privacy Steward', className: 'helper2', x: '58%', y: '24%' },
  { name: 'Schedule Steward', className: 'helper3', x: '35%', y: '52%' },
  { name: 'Wellness Guide', className: 'helper4', x: '64%', y: '52%' },
  { name: 'Memory Archivist', className: 'helper5', x: '49%', y: '64%' },
] as const

function positioned(x: string, y: string): CSSProperties {
  return { left: x, top: y }
}

export default function GroundPage() {
  const scene = getSceneDefinition('ground')

  return (
    <main
      className="groundFinal"
      data-route="ground"
      data-route-polish="walkable-first-person-ground-layer"
      data-launch-surface="premium-embodied-ground-world"
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
            style={positioned(helper.x, helper.y)}
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
        <h2>Helpers are preparing the day quietly.</h2>
        <p>
          Reception, privacy, work, wellness, memory, and logistics are arranged
          as places you can inspect before anything acts.
        </p>
        <a href="/spatial/ar-vr">Open XR entry</a>
      </aside>

      <aside className="mobileProofTray" aria-label="Mobile Ground World proof tray">
        <strong>Mobile Ground World proof tray</strong>
        <span>Reception · consent · work · wellness · memory · logistics</span>
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
          background: linear-gradient(180deg, #071019 0%, #0d1419 42%, #060708 100%);
          isolation: isolate;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .skyGlow, .floorGrid, .depthVignette { position: absolute; inset: 0; pointer-events: none; }
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
          opacity: .7;
        }
        .depthVignette { z-index: 3; background: radial-gradient(circle at 50% 50%, transparent 0 42%, rgba(0,0,0,.72) 100%); }
        .topBar { position: relative; z-index: 8; display: flex; width: fit-content; gap: .8rem; margin: 1rem; padding: .7rem 1rem; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: rgba(2,8,14,.64); backdrop-filter: blur(18px); }
        .brand { font-size: .72rem; font-weight: 950; letter-spacing: .3em; }
        .mode { font-size: .76rem; font-weight: 800; opacity: .65; }
        .heroCard, .rightCard { position: absolute; z-index: 8; width: min(370px, 31vw); padding: 1.2rem; border: 1px solid rgba(255,255,255,.14); border-radius: 1.5rem; background: rgba(3,9,15,.66); backdrop-filter: blur(18px); }
        .heroCard { left: 3vw; bottom: 7rem; }
        .rightCard { right: 3vw; bottom: 7rem; }
        .eyebrow { margin: 0 0 .45rem; color: #f3d99d; font-size: .64rem; font-weight: 950; letter-spacing: .22em; }
        .heroCard h1 { margin: 0 0 .8rem; font-size: clamp(2.8rem, 5.4vw, 5.8rem); line-height: .82; letter-spacing: -.075em; }
        .heroCard p, .rightCard p { color: rgba(246,249,255,.78); line-height: 1.5; }
        .rightCard h2 { margin: .35rem 0 .7rem; font-size: clamp(1.5rem, 2.5vw, 2.2rem); }
        .rightCard a { display: inline-flex; margin-top: .9rem; color: white; font-weight: 900; }
        .room { position: absolute; z-index: 4; inset: 5rem 3vw 5.8rem; perspective: 1400px; }
        .roomBackWall { position: absolute; left: 50%; top: 2%; width: min(720px, 54vw); height: min(390px, 43svh); transform: translateX(-50%); border: 1px solid rgba(255,255,255,.14); border-radius: 2rem; overflow: hidden; background: rgba(5,15,22,.62); }
        .orbLens { position: absolute; left: 50%; top: 43%; width: 106px; height: 106px; transform: translate(-50%,-50%); border-radius: 50%; background: radial-gradient(circle, white 0 6%, #9ff7ff 10%, rgba(103,232,249,.18) 38%, transparent 70%); box-shadow: 0 0 80px rgba(103,232,249,.45); }
        .wallLabel { position: absolute; left: 1rem; bottom: 1rem; padding: .55rem .75rem; border-radius: .8rem; background: rgba(0,0,0,.54); font-size: .7rem; font-weight: 900; }
        .station { position: absolute; z-index: 7; width: 190px; padding: .75rem; border: 1px solid rgba(255,255,255,.14); border-radius: 1.15rem; background: rgba(3,10,17,.7); color: white; backdrop-filter: blur(16px); }
        .station summary { list-style: none; cursor: pointer; }
        .station summary::-webkit-details-marker { display: none; }
        .stationTag { display: block; color: #f3d99d; font-size: .56rem; font-weight: 950; letter-spacing: .18em; }
        .station strong, .station small { display: block; }
        .station strong { margin-top: .22rem; font-size: .92rem; }
        .station small { margin-top: .3rem; color: rgba(245,250,255,.62); font-size: .65rem; line-height: 1.35; }
        .station > p { margin: .65rem 0 0; color: rgba(235,250,255,.78); font-size: .72rem; line-height: 1.42; }
        .helper { position: absolute; z-index: 6; display: grid; justify-items: center; gap: .28rem; transform: translate(-50%,-50%); }
        .helper i { width: 38px; height: 56px; border-radius: 50% 50% 42% 42%; background: linear-gradient(180deg, rgba(223,250,255,.8), rgba(86,180,220,.18)); box-shadow: 0 0 32px rgba(103,232,249,.25); }
        .helper span { padding: .3rem .45rem; border-radius: 999px; background: rgba(0,0,0,.54); font-size: .56rem; font-weight: 900; white-space: nowrap; }
        .table, .vault, .archiveCase { position: absolute; z-index: 5; border: 1px solid rgba(255,255,255,.12); background: rgba(7,14,18,.5); color: rgba(255,255,255,.62); font-size: .6rem; font-weight: 900; }
        .table { width: 180px; height: 54px; border-radius: 50%; transform: perspective(500px) rotateX(60deg); }
        .tableOne { left: 30%; top: 43%; }
        .tableTwo { right: 27%; top: 42%; }
        .vault { right: 8%; top: 32%; width: 88px; height: 116px; border-radius: 1rem; display: grid; place-items: end center; padding-bottom: .5rem; }
        .archiveCase { left: 9%; top: 34%; width: 105px; height: 90px; border-radius: 1rem; display: grid; place-items: end center; padding-bottom: .5rem; }
        .centerReticle { position: absolute; left: 50%; top: 50%; z-index: 12; width: 30px; height: 30px; transform: translate(-50%,-50%); border: 1px solid rgba(255,255,255,.32); border-radius: 50%; }
        .centerReticle span { position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; transform: translate(-50%,-50%); border-radius: 50%; background: white; box-shadow: 0 0 14px #9ff7ff; }
        .mobileProofTray { display: none; }
        .navBar { position: fixed; left: 50%; bottom: 1rem; z-index: 80; display: flex; max-width: calc(100vw - 1rem); gap: .35rem; padding: .4rem; overflow-x: auto; transform: translateX(-50%); border: 1px solid rgba(255,255,255,.12); border-radius: 999px; background: rgba(0,0,0,.58); backdrop-filter: blur(18px); }
        .navBar a { padding: .5rem .75rem; border-radius: 999px; color: rgba(245,250,255,.78); text-decoration: none; font-size: .68rem; font-weight: 950; white-space: nowrap; }
        .navBar a.active { background: rgba(225,251,255,.94); color: #020617; }
        @media (max-width: 760px) {
          .groundFinal { overflow-y: auto; }
          .mode { display: none; }
          .room { inset: 4rem .5rem 13rem; }
          .roomBackWall { width: calc(100vw - 1rem); height: 38svh; }
          .station, .helper, .table, .vault, .archiveCase { opacity: .32; pointer-events: none; }
          .heroCard, .rightCard { position: relative; left: auto; right: auto; bottom: auto; width: auto; margin: 47svh .55rem 0; }
          .rightCard { margin-top: .65rem; margin-bottom: 11rem; }
          .mobileProofTray { position: fixed; left: .55rem; right: .55rem; bottom: 4.9rem; z-index: 70; display: grid; gap: .2rem; padding: .7rem .85rem; border: 1px solid rgba(255,255,255,.14); border-radius: 1rem; background: rgba(2,8,14,.78); backdrop-filter: blur(18px); }
          .mobileProofTray strong { font-size: .7rem; }
          .mobileProofTray span { color: rgba(235,250,255,.62); font-size: .62rem; }
          .navBar { bottom: .55rem; width: calc(100vw - 1.1rem); justify-content: flex-start; }
        }
      `}</style>
    </main>
  )
}

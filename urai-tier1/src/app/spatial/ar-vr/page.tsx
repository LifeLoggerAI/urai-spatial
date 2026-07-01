import Link from 'next/link'
import QuestVrEntryButton from './QuestVrEntryButton'
import XrCapabilitySignal from './XrCapabilitySignal'
import './xr-portal.css'

export const metadata = {
  title: 'URAI XR Portal',
  description: 'Enter the URAI spatial layer for AR, VR, XR, Quest Browser, and Life Map expansion.',
}

const checks = [
  ['Quest Browser', 'Open urai.app/spatial/ar-vr in the headset, press Enter VR in Quest, then open the Spatial Life Map from the same portal.'],
  ['Capability check', 'This route checks navigator.xr, exposes an explicit immersive-vr request button, and keeps fallback instructions visible when support is absent.'],
  ['Manual proof', 'Do not mark Quest verified until the route is loaded, the VR button is tested, and the Life Map is interacted with on actual Quest hardware.'],
] as const

const chamberCss = `
.urai-xr-portal{background:radial-gradient(circle at 60% 40%,rgba(115,238,255,.25),transparent 18rem),radial-gradient(ellipse at 50% 86%,rgba(255,224,178,.18),transparent 30rem),linear-gradient(180deg,#14223e 0%,#071326 42%,#050914 64%,#020304 100%)!important}
.urai-xr-portal:before{opacity:.36!important;filter:saturate(1.35) contrast(1.16) brightness(.56)!important}
.urai-xr-portal__hero{padding:clamp(18px,2vw,30px)!important;border:1px solid rgba(226,248,255,.16)!important;border-radius:34px!important;background:linear-gradient(135deg,rgba(2,8,18,.80),rgba(8,18,34,.48))!important;box-shadow:0 38px 130px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.08)!important;backdrop-filter:blur(24px) saturate(1.1)!important}
.urai-xr-portal__world:before{content:"";position:absolute;left:-10vw;right:-10vw;bottom:-10vh;height:43vh;z-index:1;pointer-events:none;background:radial-gradient(ellipse at 50% 0%,rgba(255,229,180,.22),transparent 18rem),radial-gradient(ellipse at 47% 28%,rgba(105,235,255,.12),transparent 28rem),linear-gradient(180deg,rgba(31,37,40,.82),rgba(5,8,10,.96) 68%,#010203 100%);border-top:1px solid rgba(255,245,220,.16);transform:perspective(900px) rotateX(60deg);transform-origin:center bottom}
.urai-xr-portal__world:after{content:"";position:absolute;left:50%;bottom:18vh;width:min(58rem,58vw);height:15rem;z-index:2;pointer-events:none;border:1px solid rgba(210,248,255,.18);border-radius:999px 999px 42px 42px;background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.20),transparent 8rem),linear-gradient(180deg,rgba(148,232,255,.10),rgba(2,8,18,.08));box-shadow:0 0 120px rgba(116,235,255,.12),inset 0 0 80px rgba(116,235,255,.05);transform:translateX(-50%) perspective(700px) rotateX(58deg)}
.urai-xr-portal__orb{left:62%!important;top:47%!important;z-index:6!important;width:clamp(230px,23vw,360px)!important;filter:drop-shadow(0 34px 110px rgba(0,0,0,.40))}
.urai-xr-portal__card{background:linear-gradient(145deg,rgba(3,12,30,.74),rgba(10,18,24,.52))!important;box-shadow:0 28px 90px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.10)!important}
.urai-xr-portal__actions a,.urai-xr-portal__actions button,.urai-xr-portal__rail a{position:relative;z-index:30!important;touch-action:manipulation}
@media(max-width:860px){.urai-xr-portal__world:before{bottom:-3vh;height:30vh}.urai-xr-portal__world:after{bottom:17vh;width:min(92vw,34rem);height:13rem}.urai-xr-portal__orb{left:50%!important;top:38%!important;width:min(250px,62vw)!important}}
`

export default function SpatialArVrPage() {
  return (
    <main className="urai-xr-portal" data-testid="urai-quest-webxr-ready-portal" data-quest-proof="manual-device-required">
      <style dangerouslySetInnerHTML={{ __html: chamberCss }} />
      <div className="urai-xr-portal__stars" aria-hidden="true" />
      <section className="urai-xr-portal__hero">
        <p className="urai-xr-portal__kicker">AR / VR / XR PORTAL</p>
        <h1>Step inside the Life Map.</h1>
        <p className="urai-xr-portal__lede">
          URAI opens here as a headset entry chamber: orb in front, Ground below, Life Map ahead, and clear WebXR proof controls for Quest Browser.
        </p>

        <div className="urai-xr-portal__actions">
          <QuestVrEntryButton />
          <Link href="/spatial/life-map">Open Spatial Life Map</Link>
          <Link href="/life-map">Open Life Map</Link>
          <Link href="/ground">Return to Ground</Link>
        </div>
      </section>

      <section className="urai-xr-portal__world" aria-label="URAI XR world status">
        <div className="urai-xr-portal__orb"><span /><i /><b /></div>
        <div className="urai-xr-portal__ring urai-xr-portal__ring--one" />
        <div className="urai-xr-portal__ring urai-xr-portal__ring--two" />
        <div className="urai-xr-portal__ring urai-xr-portal__ring--three" />

        {checks.map(([title, copy], index) => (
          <article key={title} className={`urai-xr-portal__card ${index === 0 ? 'urai-xr-portal__card--quest' : index === 1 ? 'urai-xr-portal__card--webxr' : 'urai-xr-portal__card--life'}`}>
            <span>{title}</span>
            <strong>{index === 0 ? 'Enter VR is visible' : index === 1 ? 'Fallback ready' : 'Record honestly'}</strong>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <XrCapabilitySignal />

      <aside className="fixed bottom-24 right-4 z-30 w-[min(390px,calc(100vw-2rem))] rounded-3xl border border-cyan-100/15 bg-slate-950/75 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Quest 2 manual test</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-semibold leading-6 text-slate-100/80">
          <li>Open Quest Browser.</li>
          <li>Visit urai.app/spatial/ar-vr.</li>
          <li>Press Enter VR in Quest and record whether the browser allows immersive mode.</li>
          <li>Open Spatial Life Map and confirm drag, zoom, star select, Focus and Replay buttons.</li>
        </ol>
      </aside>

      <nav className="urai-xr-portal__rail" aria-label="URAI XR navigation">
        <Link href="/">Home</Link>
        <Link href="/ground">Ground</Link>
        <Link href="/life-map">Life Map</Link>
        <Link href="/focus">Focus</Link>
        <Link href="/replay">Replay</Link>
        <Link href="/passport">Passport</Link>
      </nav>
    </main>
  )
}

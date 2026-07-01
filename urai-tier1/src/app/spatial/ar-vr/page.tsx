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
.urai-xr-portal{background:radial-gradient(circle at 55% 38%,rgba(135,245,255,.32),transparent 18rem),radial-gradient(circle at 78% 19%,rgba(195,140,255,.24),transparent 18rem),radial-gradient(ellipse at 50% 86%,rgba(255,220,170,.25),transparent 32rem),linear-gradient(180deg,#192846 0%,#071326 42%,#050914 64%,#020304 100%)!important}
.urai-xr-portal:before{opacity:.26!important;filter:saturate(1.45) contrast(1.18) brightness(.50)!important}
.urai-xr-portal:after{background:radial-gradient(ellipse at 50% 40%,transparent 0 20%,rgba(0,0,0,.28) 58%,rgba(0,0,0,.9) 100%),linear-gradient(90deg,rgba(0,0,0,.74),transparent 24%,transparent 76%,rgba(0,0,0,.74))!important}
.urai-xr-portal__hero{top:clamp(48px,7vh,92px)!important;padding:clamp(20px,2vw,32px)!important;border:1px solid rgba(226,248,255,.22)!important;border-radius:34px!important;background:linear-gradient(135deg,rgba(2,8,18,.86),rgba(8,18,34,.54))!important;box-shadow:0 38px 130px rgba(0,0,0,.52),0 0 80px rgba(99,230,255,.08),inset 0 1px 0 rgba(255,255,255,.12)!important;backdrop-filter:blur(24px) saturate(1.2)!important}
.urai-xr-portal__hero:after{content:"QUEST CHAMBER LIVE";display:inline-flex;margin-top:16px;border:1px solid rgba(140,245,255,.28);border-radius:999px;padding:8px 12px;color:#03111a;background:linear-gradient(180deg,#ffffff,#8ff2ff);font-size:.68rem;font-weight:1000;letter-spacing:.14em;box-shadow:0 0 34px rgba(120,235,255,.22)}
.urai-xr-portal h1{font-size:clamp(4.4rem,8.8vw,9.8rem)!important;max-width:9ch!important}
.urai-xr-portal__lede{font-size:1.05rem!important;color:rgba(242,252,255,.9)!important}
.urai-xr-portal__world:before{content:"";position:absolute;left:-12vw;right:-12vw;bottom:-8vh;height:50vh;z-index:1;pointer-events:none;background:radial-gradient(ellipse at 50% 0%,rgba(255,229,180,.30),transparent 18rem),radial-gradient(ellipse at 48% 30%,rgba(105,235,255,.18),transparent 28rem),linear-gradient(90deg,transparent 0 18%,rgba(255,255,255,.13) 18.1% 18.45%,transparent 18.9%),linear-gradient(90deg,transparent 0 50%,rgba(140,245,255,.14) 50.1% 50.35%,transparent 50.7%),linear-gradient(90deg,transparent 0 76%,rgba(116,238,255,.16) 76.1% 76.45%,transparent 76.9%),linear-gradient(180deg,rgba(45,50,50,.90),rgba(8,10,12,.98) 68%,#010203 100%);border-top:1px solid rgba(255,245,220,.22);box-shadow:0 -80px 180px rgba(255,220,160,.06),inset 0 1px 0 rgba(255,255,255,.16);transform:perspective(900px) rotateX(60deg);transform-origin:center bottom}
.urai-xr-portal__world:after{content:"";position:absolute;left:50%;bottom:20vh;width:min(72rem,70vw);height:22rem;z-index:2;pointer-events:none;border:2px solid rgba(210,248,255,.26);border-radius:999px 999px 54px 54px;background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.24),transparent 8rem),radial-gradient(ellipse at 50% 100%,rgba(111,240,255,.24),transparent 18rem),linear-gradient(180deg,rgba(148,232,255,.18),rgba(2,8,18,.12));box-shadow:0 0 160px rgba(116,235,255,.20),inset 0 0 100px rgba(116,235,255,.10);transform:translateX(-50%) perspective(700px) rotateX(58deg)}
.urai-xr-portal__orb{left:61%!important;top:45%!important;z-index:7!important;width:clamp(320px,30vw,520px)!important;filter:drop-shadow(0 42px 140px rgba(0,0,0,.52))}
.urai-xr-portal__orb:after{content:"URAI";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:rgba(255,255,255,.92);font-size:clamp(1rem,2vw,2.2rem);font-weight:1000;letter-spacing:.18em;text-shadow:0 0 30px rgba(255,255,255,.8)}
.urai-xr-portal__orb span{box-shadow:0 0 90px rgba(120,235,255,.94),0 0 240px rgba(120,235,255,.44),inset 0 0 62px rgba(255,255,255,.34)!important}
.urai-xr-portal__ring{left:61%!important;top:45%!important;z-index:6!important}
.urai-xr-portal__card{width:min(340px,25vw)!important;background:linear-gradient(145deg,rgba(3,12,30,.82),rgba(10,18,24,.58))!important;box-shadow:0 34px 100px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.12)!important}
.urai-xr-portal__card--quest{right:4vw!important;top:10vh!important}.urai-xr-portal__card--webxr{right:4vw!important;bottom:18vh!important}.urai-xr-portal__card--life{left:45vw!important;bottom:7vh!important}
.urai-xr-portal__portal-door{position:absolute;z-index:9;display:flex;flex-direction:column;gap:8px;width:min(300px,22vw);border:1px solid rgba(210,248,255,.24);border-radius:32px;padding:18px;color:#f7fdff;text-decoration:none;background:linear-gradient(180deg,rgba(8,18,34,.82),rgba(2,8,18,.58));box-shadow:0 40px 130px rgba(0,0,0,.45),0 0 70px rgba(120,235,255,.12);backdrop-filter:blur(18px);pointer-events:auto;touch-action:manipulation}
.urai-xr-portal__portal-door span{color:#8ff6ff;font-size:.62rem;font-weight:1000;letter-spacing:.18em;text-transform:uppercase}.urai-xr-portal__portal-door strong{font-size:1.2rem}.urai-xr-portal__portal-door small{color:rgba(235,250,255,.72);font-weight:760;line-height:1.45}
.urai-xr-portal__portal-door--life{left:50%;top:17vh;transform:translateX(-5%)}.urai-xr-portal__portal-door--ground{left:55%;bottom:10vh;transform:translateX(-50%)}
.urai-xr-portal__actions a,.urai-xr-portal__actions button,.urai-xr-portal__rail a{position:relative;z-index:30!important;touch-action:manipulation}
@media(max-width:860px){.urai-xr-portal__hero{top:auto!important}.urai-xr-portal h1{font-size:clamp(3.4rem,16vw,6.2rem)!important}.urai-xr-portal__world:before{bottom:-2vh;height:34vh}.urai-xr-portal__world:after{bottom:18vh;width:min(96vw,38rem);height:14rem}.urai-xr-portal__orb{left:50%!important;top:35%!important;width:min(330px,82vw)!important}.urai-xr-portal__ring{left:50%!important;top:35%!important}.urai-xr-portal__portal-door{position:relative;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;width:auto;margin:12px 0}.urai-xr-portal__card{width:auto!important}}
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
          URAI opens here as a headset entry chamber: a huge orb in front, a real Ground floor under you, and two obvious doors into Life Map and Ground.
        </p>

        <div className="urai-xr-portal__actions">
          <QuestVrEntryButton />
          <Link href="/spatial/life-map">Enter Life Map</Link>
          <Link href="/ground">Enter Ground</Link>
          <Link href="/home">Return Home</Link>
        </div>
      </section>

      <section className="urai-xr-portal__world" aria-label="URAI XR world status">
        <Link href="/spatial/life-map" className="urai-xr-portal__portal-door urai-xr-portal__portal-door--life">
          <span>Door one</span>
          <strong>Life Map opens ahead</strong>
          <small>Constellation field, Focus chambers, Replay memories.</small>
        </Link>

        <Link href="/ground" className="urai-xr-portal__portal-door urai-xr-portal__portal-door--ground">
          <span>Door two</span>
          <strong>Ground below you</strong>
          <small>Private operations floor, sanctuary, objects, and helpers.</small>
        </Link>

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
          <li>Confirm the huge orb, Life Map door, and Ground door are visible.</li>
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

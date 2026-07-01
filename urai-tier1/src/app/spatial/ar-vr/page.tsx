import Link from 'next/link'
import QuestVrEntryButton from './QuestVrEntryButton'
import XrCapabilitySignal from './XrCapabilitySignal'
import './xr-portal.css'

export const metadata = {
  title: 'URAI XR Portal',
  description: 'Enter URAI as a first-person camera: Ground below, Life Map above, Quest/WebXR proof kept honest.',
}

const checks = [
  ['Quest Browser', 'Open urai.app/spatial/ar-vr in the headset, press Enter VR, then enter Ground and Life Map from this chamber.'],
  ['Ground canon', 'Ground is first-person camera. The Home avatar and Home orb remain anchored at /home.'],
  ['Manual proof', 'Do not mark Quest verified until this route and the Ground entry are tested on physical hardware.'],
] as const

export default function SpatialArVrPage() {
  return (
    <main className="urai-xr-portal" data-testid="urai-quest-webxr-ready-portal" data-quest-proof="manual-device-required" data-ground-camera-mode="first-person" data-home-avatar-orb="anchored-at-home">
      <div className="urai-xr-portal__stars" aria-hidden="true" />
      <section className="urai-xr-portal__hero">
        <p className="urai-xr-portal__kicker">AR / VR / XR PORTAL</p>
        <h1>Enter as the camera.</h1>
        <p className="urai-xr-portal__lede">
          Ground is the lower life layer. In XR, the user enters it as a first-person camera; the Home body/avatar and orb remain anchored at Home.
        </p>

        <div className="urai-xr-portal__actions">
          <QuestVrEntryButton />
          <Link href="/ground?mode=xr-camera">Enter Ground</Link>
          <Link href="/spatial/life-map">Enter Life Map</Link>
          <Link href="/home">Return Home</Link>
        </div>
      </section>

      <section className="urai-xr-portal__world" aria-label="URAI XR world status">
        <Link href="/spatial/life-map" className="urai-xr-portal__portal-door urai-xr-portal__portal-door--life">
          <span>Above</span>
          <strong>Life Map</strong>
          <small>Constellation field, Focus chambers, Replay memories.</small>
        </Link>

        <Link href="/ground?mode=xr-camera" className="urai-xr-portal__portal-door urai-xr-portal__portal-door--ground">
          <span>Below</span>
          <strong>Walk Ground</strong>
          <small>First-person operations floor: sanctuary, objects, helpers, and routes.</small>
        </Link>

        <div className="urai-xr-portal__ring urai-xr-portal__ring--one" />
        <div className="urai-xr-portal__ring urai-xr-portal__ring--two" />
        <div className="urai-xr-portal__ring urai-xr-portal__ring--three" />

        {checks.map(([title, copy], index) => (
          <article key={title} className={`urai-xr-portal__card ${index === 0 ? 'urai-xr-portal__card--quest' : index === 1 ? 'urai-xr-portal__card--webxr' : 'urai-xr-portal__card--life'}`}>
            <span>{title}</span>
            <strong>{index === 0 ? 'Enter VR visible' : index === 1 ? 'Canon locked' : 'Record honestly'}</strong>
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
          <li>Confirm Life Map and first-person Ground doors are visible.</li>
          <li>Press Enter VR and record whether immersive mode is allowed.</li>
          <li>Enter Ground and confirm there is no Home avatar and no Home orb.</li>
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

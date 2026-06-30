import Link from 'next/link'
import './xr-portal.css'

export const metadata = {
  title: 'URAI XR Portal',
  description: 'Enter the URAI spatial layer for AR, VR, XR, Quest Browser, and Life Map expansion.',
}

const checks = [
  ['Quest Browser', 'Open urai.app/spatial/life-map and urai.app/spatial/ar-vr from the headset browser.'],
  ['Capability check', 'WebXR support is browser and device dependent; unsupported browsers keep the spatial fallback visible.'],
  ['Manual proof', 'Do not mark Quest verified until the route is loaded and interacted with on actual Quest hardware.'],
] as const

export default function SpatialArVrPage() {
  return (
    <main className="urai-xr-portal" data-testid="urai-quest-webxr-ready-portal" data-quest-proof="manual-device-required">
      <div className="urai-xr-portal__stars" aria-hidden="true" />
      <section className="urai-xr-portal__hero">
        <p className="urai-xr-portal__kicker">AR / VR / XR PORTAL</p>
        <h1>Step inside the Life Map.</h1>
        <p className="urai-xr-portal__lede">
          URAI&apos;s spatial layer is live with a Quest-ready entry path, WebXR fallback language, and manual headset proof steps. Hardware verification still requires an actual Quest Browser session.
        </p>

        <div className="urai-xr-portal__actions">
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
            <strong>{index === 0 ? 'Manual proof required' : index === 1 ? 'Fallback ready' : 'Record honestly'}</strong>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <aside className="fixed bottom-24 right-4 z-30 w-[min(390px,calc(100vw-2rem))] rounded-3xl border border-cyan-100/15 bg-slate-950/75 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Quest 2 manual test</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-semibold leading-6 text-slate-100/80">
          <li>Open Quest Browser.</li>
          <li>Visit urai.app/spatial/life-map.</li>
          <li>Confirm drag, zoom, star select, Focus and Replay buttons.</li>
          <li>Visit urai.app/spatial/ar-vr and confirm this portal is readable.</li>
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

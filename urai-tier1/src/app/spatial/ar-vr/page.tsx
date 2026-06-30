import Link from 'next/link'
import './xr-portal.css'

export const metadata = {
  title: 'URAI XR Portal',
  description: 'Enter the URAI spatial layer for AR, VR, XR, Quest Browser, and Life Map expansion.',
}

export default function SpatialArVrPage() {
  return (
    <main className="urai-xr-portal">
      <div className="urai-xr-portal__stars" aria-hidden="true" />
      <section className="urai-xr-portal__hero">
        <p className="urai-xr-portal__kicker">AR / VR / XR PORTAL</p>
        <h1>Step inside the Life Map.</h1>
        <p className="urai-xr-portal__lede">
          URAI&apos;s spatial layer is live: anchors, coordinate space, WebXR signaling,
          and Quest-ready entry paths are online for the private world.
        </p>

        <div className="urai-xr-portal__actions">
          <Link href="/life-map">Open Life Map</Link>
          <Link href="/ground">Return to Ground</Link>
          <Link href="/">Home</Link>
        </div>
      </section>

      <section className="urai-xr-portal__world" aria-label="URAI XR world status">
        <div className="urai-xr-portal__orb">
          <span />
          <i />
          <b />
        </div>

        <div className="urai-xr-portal__ring urai-xr-portal__ring--one" />
        <div className="urai-xr-portal__ring urai-xr-portal__ring--two" />
        <div className="urai-xr-portal__ring urai-xr-portal__ring--three" />

        <article className="urai-xr-portal__card urai-xr-portal__card--quest">
          <span>Quest Browser</span>
          <strong>Spatial doorway ready</strong>
          <p>Open URAI from headset browser and enter the spatial route chain.</p>
        </article>

        <article className="urai-xr-portal__card urai-xr-portal__card--webxr">
          <span>WebXR Spine</span>
          <strong>Signaling API online</strong>
          <p>Live endpoint prepared for rooms, anchors, and shared spatial state.</p>
        </article>

        <article className="urai-xr-portal__card urai-xr-portal__card--life">
          <span>Life Map Layer</span>
          <strong>Galaxy maps to space</strong>
          <p>Stars, memories, places, and replay paths become navigable anchors.</p>
        </article>
      </section>

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

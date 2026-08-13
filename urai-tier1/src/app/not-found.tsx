import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="urai-system-state">
      <div className="urai-system-state__content">
        <div className="urai-system-state__orb" aria-hidden="true" />
        <p className="urai-system-state__eyebrow">URAI</p>
        <h1>This place isn’t part of your world</h1>
        <p className="urai-system-state__message">
          The address may have changed, or this view may no longer be available.
        </p>
        <div className="urai-system-state__actions">
          <Link href="/" className="urai-system-state__action">
            Return home
          </Link>
        </div>
      </div>
    </main>
  )
}

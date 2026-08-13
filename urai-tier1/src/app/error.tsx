"use client"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="urai-system-state" role="alert">
      <div className="urai-system-state__content">
        <div className="urai-system-state__orb" aria-hidden="true" />
        <p className="urai-system-state__eyebrow">URAI</p>
        <h1>Your world was interrupted</h1>
        <p className="urai-system-state__message">
          Nothing was changed. Try reopening this view, or return home if the interruption continues.
        </p>
        <div className="urai-system-state__actions">
          <button className="urai-system-state__action" type="button" onClick={reset}>
            Try again
          </button>
          <a className="urai-system-state__action urai-system-state__action--secondary" href="/">
            Return home
          </a>
        </div>
      </div>
    </main>
  )
}

export default function Loading() {
  return (
    <main className="urai-system-state" aria-busy="true" aria-live="polite">
      <div className="urai-system-state__content">
        <div className="urai-system-state__orb" data-animate="true" aria-hidden="true" />
        <p className="urai-system-state__eyebrow">URAI</p>
        <h1>Opening your world</h1>
        <p className="urai-system-state__message">Preparing the environment and the parts of your life that are ready to appear.</p>
      </div>
    </main>
  )
}

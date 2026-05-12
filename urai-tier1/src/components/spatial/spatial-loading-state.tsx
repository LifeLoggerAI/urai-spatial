export function SpatialLoadingState({ label = "Loading spatial world" }: { label?: string }) {
  return (
    <main className="spatialLoading" aria-busy="true" aria-live="polite">
      <div className="spatialLoading__orb" aria-hidden="true" />
      <p>{label}</p>
      <style jsx>{`.spatialLoading{min-height:100svh;display:grid;place-content:center;gap:1rem;background:linear-gradient(180deg,#10234b,#020711);color:#dff7ff;font-family:Inter,ui-sans-serif,system-ui;text-align:center}.spatialLoading__orb{width:4rem;height:4rem;border-radius:999px;background:radial-gradient(circle,#86e3ff,rgba(88,201,255,.2) 62%,transparent);box-shadow:0 0 3rem rgba(101,219,255,.55);animation:pulse 4s ease-in-out infinite;margin:auto}@keyframes pulse{0%,100%{transform:scale(.9);opacity:.7}50%{transform:scale(1.1);opacity:1}}@media(prefers-reduced-motion:reduce){.spatialLoading__orb{animation:none}}`}</style>
    </main>
  );
}

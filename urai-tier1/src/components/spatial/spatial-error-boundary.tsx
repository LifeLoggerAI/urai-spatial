"use client";

export function SpatialErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="spatialError" role="alert">
      <h1>Spatial world paused safely.</h1>
      <p>{error.message || "URAI Spatial could not render this scene."}</p>
      <button type="button" onClick={reset}>Try again</button>
      <a href="/spatial">Return to Spatial Home</a>
      <style jsx>{`.spatialError{min-height:100svh;display:grid;place-content:center;gap:1rem;background:linear-gradient(180deg,#10234b,#020711);color:#dff7ff;font-family:Inter,ui-sans-serif,system-ui;text-align:center;padding:2rem}.spatialError h1{margin:0}.spatialError p{max-width:34rem;color:#b9d9e7}.spatialError button,.spatialError a{justify-self:center;border:1px solid rgba(160,228,255,.24);border-radius:999px;background:rgba(61,139,180,.18);color:#dff7ff;padding:.7rem 1rem;text-decoration:none;font-weight:800}`}</style>
    </main>
  );
}

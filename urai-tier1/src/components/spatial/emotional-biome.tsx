import { demoEmotionalBiome } from "@/lib/spatial/publicSafeSpatialData";

export function EmotionalBiome() {
  const biome = demoEmotionalBiome;
  const entries = Object.entries(biome.intensityMap);
  return (
    <main className="biome" aria-label="Emotional Biome">
      <section>
        <p className="eyebrow">Spatial Biome</p>
        <h1>{biome.terrainType} · {biome.dominantMood}</h1>
        <p>The horizon resolves into a public-safe emotional terrain layer powered by Firestore-shaped biome data.</p>
        <div className="metrics">{entries.map(([key, value]) => <label key={key}>{key}<span><i style={{ width: `${Math.round(value * 100)}%` }} /></span><b>{Math.round(value * 100)}%</b></label>)}</div>
        <a href="/spatial">Return to Spatial Home</a>
      </section>
      <style jsx>{`.biome{min-height:100svh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 72%,rgba(72,193,220,.3),transparent 35%),linear-gradient(180deg,#10234b,#020711);color:#e6f9ff;font-family:Inter,ui-sans-serif,system-ui;padding:2rem}.biome section{width:min(46rem,92vw);padding:1.4rem;border:1px solid rgba(180,230,255,.18);border-radius:1.4rem;background:rgba(4,14,28,.62);backdrop-filter:blur(16px)}.eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#91dfff;font-size:.72rem}.biome h1{margin:.2rem 0;font-size:clamp(2rem,6vw,4rem);text-transform:capitalize}.biome p{color:#c8e7f0}.metrics{display:grid;gap:.65rem;margin:1.2rem 0}.metrics label{display:grid;grid-template-columns:7rem 1fr 3rem;align-items:center;gap:.65rem;text-transform:capitalize}.metrics span{height:.55rem;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}.metrics i{display:block;height:100%;border-radius:inherit;background:#8bdcff;box-shadow:0 0 1rem #8bdcff}.biome a{color:#bfefff;font-weight:800}`}</style>
    </main>
  );
}

"use client";

import DocumentScrollArea from "@/components/public/DocumentScrollArea";
import AdamLauncherSlot from "@/spatial/adam/AdamLauncherSlot";
import { demoEmotionalBiome } from "@/lib/spatial/publicSafeSpatialData";

export function EmotionalBiome() {
  const biome = demoEmotionalBiome;
  const entries = Object.entries(biome.intensityMap);
  return (
    <DocumentScrollArea className="biome" aria-label="Emotional Biome">
      <section>
        <p className="eyebrow">Sample emotional landscape</p>
        <h1>{biome.terrainType} · {biome.dominantMood}</h1>
        <p>A sample landscape for reflection. These illustrative patterns are not an assessment of your mood or health.</p>
        <div className="metrics">{entries.map(([key, value]) => <label key={key}>{key}<span><i style={{ width: `${Math.round(value * 100)}%` }} /></span><b>{Math.round(value * 100)}%</b></label>)}</div>
        <nav aria-label="Page actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, maxWidth: '100%' }}>
          <a href="/spatial" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 48 }}>Return to Spatial Home</a>
          <AdamLauncherSlot name="emotional-biome-actions" />
        </nav>
      </section>
      <style jsx>{`.biome{min-height:100svh;display:grid;align-items:safe center;justify-items:center;background:radial-gradient(ellipse at 50% 72%,rgba(72,193,220,.3),transparent 35%),linear-gradient(180deg,#10234b,#020711);color:#e6f9ff;font-family:Inter,ui-sans-serif,system-ui;padding:clamp(18px,5vw,32px)}.biome section{box-sizing:border-box;min-width:0;width:min(46rem,100%);padding:1.4rem;border:1px solid rgba(180,230,255,.18);border-radius:1.4rem;background:rgba(4,14,28,.62);backdrop-filter:blur(16px)}.eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#91dfff;font-size:.72rem}.biome h1{margin:.2rem 0;font-size:clamp(2rem,6vw,4rem);text-transform:capitalize}.biome p{color:#c8e7f0}.metrics{display:grid;gap:.65rem;margin:1.2rem 0}.metrics label{display:grid;grid-template-columns:minmax(0,6rem) minmax(0,1fr) 2.5rem;align-items:center;gap:.65rem;text-transform:capitalize}.metrics span{height:.55rem;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}.metrics i{display:block;height:100%;border-radius:inherit;background:#8bdcff;box-shadow:0 0 1rem #8bdcff}.biome a{color:#bfefff;font-weight:800}`}</style>
    </DocumentScrollArea>
  );
}

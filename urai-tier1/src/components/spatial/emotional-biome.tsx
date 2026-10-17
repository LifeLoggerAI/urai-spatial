"use client";

import DocumentScrollArea from "@/components/public/DocumentScrollArea";
import AdamLauncherSlot from "@/spatial/adam/AdamLauncherSlot";
import { demoEmotionalBiome } from "@/lib/spatial/publicSafeSpatialData";
import styles from './emotional-biome.module.css';

export function EmotionalBiome() {
  const biome = demoEmotionalBiome;
  const entries = Object.entries(biome.intensityMap);
  return (
    <DocumentScrollArea className={styles.biome} aria-label="Emotional Biome">
      <section>
        <p className={styles.eyebrow}>Sample emotional landscape</p>
        <h1>{biome.terrainType} · {biome.dominantMood}</h1>
        <p>A sample landscape for reflection. These illustrative patterns are not an assessment of your mood or health.</p>
        <div className={styles.metrics}>{entries.map(([key, value]) => <label key={key}>{key}<span><i style={{ width: `${Math.round(value * 100)}%` }} /></span><b>{Math.round(value * 100)}%</b></label>)}</div>
        <nav aria-label="Page actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, maxWidth: '100%' }}>
          <a href="/spatial" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 48 }}>Return to Spatial Home</a>
          <AdamLauncherSlot name="emotional-biome-actions" />
        </nav>
      </section>
    </DocumentScrollArea>
  );
}

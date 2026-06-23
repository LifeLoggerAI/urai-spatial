"use client";

import Link from "next/link";
import styles from "./HomeWorldProduction.module.css";

export function HomeWorldProduction() {
  return (
    <main className={styles.world} data-urai-home-production>
      <div className={styles.stars} aria-hidden="true" />
      <div className={styles.galaxy} aria-hidden="true" />
      <div className={styles.cloudLeft} aria-hidden="true" />
      <div className={styles.cloudRight} aria-hidden="true" />

      <header className={styles.brand} aria-label="URAI Spatial">
        <strong>URAI</strong>
        <span>SPATIAL</span>
      </header>

      <Link className={styles.skyZone} href="/life-map" aria-label="Click the sky to ascend into your Life Map">
        <span>
          <b>Click the sky</b>
          <small>Ascend into your memory galaxy.</small>
        </span>
      </Link>

      <section className={styles.hero}>
        <h1>Own your life.<br />Step inside yourself.</h1>
        <p>Ground below. Memory above. Your world begins here.</p>
      </section>

      <Link className={styles.groundZone} href="/ground" aria-label="Click the ground to enter your embodied world">
        <span>
          <b>Click the ground</b>
          <small>Enter your embodied world.</small>
        </span>
      </Link>

      <section className={styles.groundScene} aria-hidden="true">
        <div className={styles.horizon} />
        <div className={styles.terrace} />
        <div className={styles.portalRay} />
        <div className={styles.portalRing} />
        <div className={styles.portalOrb} />
        <span className={styles.centerPerson} />
        <span className={styles.memoryCase} />
        <span className={styles.statusCase} />
      </section>
    </main>
  );
}

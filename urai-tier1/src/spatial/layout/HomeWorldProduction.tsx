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
        <p>Chat is the doorway. Your world is the interface.</p>
      </section>

      <section className={styles.controlStack} aria-label="URAI threshold controls">
        <details className={styles.orbPanel}>
          <summary aria-label="Click the orb to open the URAI companion panel">
            <span>Orb</span>
            <strong>Open companion</strong>
          </summary>
          <div className={styles.panel}>
            <p className={styles.panelEyebrow}>Companion online</p>
            <h2>Chat opens the doorway.</h2>
            <p>With permission, URAI reflects your state so your world can respond.</p>
            <p>URAI handles the noise. You live the life.</p>
            <div className={styles.panelLinks}>
              <Link href="/life-map">Ascend to Life Map</Link>
              <Link href="/ground">Enter Ground</Link>
            </div>
          </div>
        </details>

        <details className={styles.avatarPanel}>
          <summary aria-label="Click the self avatar to open the life state panel">
            <span>Self</span>
            <strong>Open state</strong>
          </summary>
          <div className={styles.panel}>
            <p className={styles.panelEyebrow}>Private state panel</p>
            <h2>Your life signals stay yours.</h2>
            <p>Body, focus, recovery, and pressure signals are reflected as context only, never diagnosis.</p>
            <p>Your data belongs to you. Model access stays permissioned.</p>
            <div className={styles.panelLinks}>
              <Link href="/mirror">Open Mirror</Link>
              <Link href="/passport">Open Passport</Link>
            </div>
          </div>
        </details>
      </section>

      <section className={styles.councilHint} aria-label="Council workforce presence">
        <span>Visible Council</span>
        <strong>Models with roles. Access with permission.</strong>
        <Link href="/ground">Meet workforce</Link>
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

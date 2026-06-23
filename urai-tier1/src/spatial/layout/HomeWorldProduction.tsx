"use client";

import Link from "next/link";
import styles from "./HomeWorldProduction.module.css";

const routeRail = [
  ["Home", "/home"],
  ["Ground", "/ground"],
  ["Life Map", "/life-map"],
  ["Focus", "/focus"],
  ["Replay", "/replay"],
  ["Mirror", "/mirror"],
  ["Passport", "/passport"],
  ["Status", "/status"],
] as const;

export function HomeWorldProduction() {
  return (
    <main
      className={styles.world}
      data-urai-home-production
      data-urai-launch-revision="2026-06-23-embodied-threshold-polish"
    >
      <div className={styles.stars} aria-hidden="true" />
      <div className={styles.galaxy} aria-hidden="true" />
      <div className={styles.cloudLeft} aria-hidden="true" />
      <div className={styles.cloudRight} aria-hidden="true" />

      <header className={styles.brand} aria-label="URAI Spatial">
        <strong>URAI</strong>
        <span>SPATIAL</span>
      </header>

      <Link className={styles.skyZone} href="/life-map" aria-label="Click the sky to enter your Life Map">
        <span>
          <b>Click the sky</b>
          <small>Enter your Life Map galaxy.</small>
        </span>
      </Link>

      <Link className={styles.groundZone} href="/ground" aria-label="Click the ground to enter your private workforce">
        <span>
          <b>Click the ground</b>
          <small>Enter your private workforce and real-life operating layer.</small>
        </span>
      </Link>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Home threshold</p>
        <h1>Own your life.<br />Step inside yourself.</h1>
        <p className={styles.subhead}>Click the ground to enter your private workforce. Click the sky to enter your Life Map.</p>
      </section>

      <section className={styles.hud} aria-label="URAI threshold HUD">
        <article>
          <span>Orb companion</span>
          <strong>Listening at the doorway</strong>
          <p>Ask, review, approve, then move through the world with permissioned context.</p>
        </article>
        <article>
          <span>Self state</span>
          <strong>Private signals stay yours</strong>
          <p>Focus, recovery, pressure, and body context reflect as guidance only, never diagnosis.</p>
        </article>
      </section>

      <section className={styles.previewStack} aria-label="Route previews">
        <Link href="/life-map" className={styles.previewSky}>
          <span>Sky route</span>
          <strong>Life Map galaxy</strong>
          <p>Memory stars, chapters, patterns, and replay paths open above the horizon.</p>
        </Link>
        <Link href="/ground" className={styles.previewGround}>
          <span>Ground route</span>
          <strong>Private workforce</strong>
          <p>Agents, objects, tasks, calendars, relationships, and permission gates live below your feet.</p>
        </Link>
      </section>

      <section className={styles.councilHint} aria-label="Council workforce presence">
        <span>Visible workforce</span>
        <strong>Guide, Operator, Builder, Archivist, Protector, Mirror, and Legacy roles wait in Ground.</strong>
        <Link href="/ground">Meet workforce</Link>
      </section>

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

      <nav className={styles.routeRail} aria-label="URAI launch route chain">
        {routeRail.map(([label, href]) => (
          <Link key={href} href={href} data-active={label === "Home" ? "true" : "false"}>{label}</Link>
        ))}
      </nav>
    </main>
  );
}

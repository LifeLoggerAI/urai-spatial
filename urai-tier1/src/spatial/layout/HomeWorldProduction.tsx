"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { assetCssStack, homeAssets, uiAssets } from "@/spatial/assets/uraiAssets";
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

const worldStyle = {
  "--home-threshold-stack": assetCssStack(homeAssets.primary),
  "--home-ground-portal-stack": assetCssStack(homeAssets.accents.groundPortal),
  "--home-sky-ascent-stack": assetCssStack(homeAssets.accents.skyAscent),
  "--orb-listening-stack": assetCssStack(uiAssets.orbListening),
} as CSSProperties;

export function HomeWorldProduction() {
  return (
    <main
      className={styles.world}
      style={worldStyle}
      data-urai-home-production
      data-urai-launch-revision="2026-06-23-assetized-threshold-world"
    >
      <div className={styles.assetBackdrop} aria-hidden="true" />
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
          <small>Ascend into the memory galaxy above this place.</small>
        </span>
      </Link>

      <Link className={styles.groundZone} href="/ground" aria-label="Click the ground to enter your private workforce">
        <span>
          <b>Click the ground</b>
          <small>Enter your real-life world, private workforce, and permission layer.</small>
        </span>
      </Link>

      <section className={styles.hero} aria-label="URAI Home threshold">
        <p className={styles.eyebrow}>Home threshold</p>
        <h1>Own your life.<br />Step inside yourself.</h1>
        <p className={styles.subhead}>The ground opens your private real-life world. The sky opens your Life Map galaxy.</p>
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
          <strong>Real-life world</strong>
          <p>Reception, privacy, tasks, calendars, relationships, objects, and helpers live below your feet.</p>
        </Link>
      </section>

      <section className={styles.councilHint} aria-label="Private workforce presence">
        <span>Visible workforce</span>
        <strong>Receptionist, Privacy Steward, Schedule Steward, Wellness Guide, Relationship Liaison, and Logistics Helper wait in Ground.</strong>
        <Link href="/ground">Meet workforce</Link>
      </section>

      <section className={styles.groundScene} aria-hidden="true">
        <div className={styles.horizon} />
        <div className={styles.terrace} />
        <div className={styles.groundPortalArt} />
        <div className={styles.skyAscentArt} />
        <div className={styles.portalRay} />
        <div className={styles.portalRing} />
        <div className={styles.portalOrb} />
        <span className={styles.centerPerson} />
        <span className={styles.memoryCase} />
        <span className={styles.statusCase} />
        <span className={`${styles.workforceFigure} ${styles.workforceReception}`} />
        <span className={`${styles.workforceFigure} ${styles.workforcePrivacy}`} />
        <span className={`${styles.workforceFigure} ${styles.workforceLogistics}`} />
      </section>

      <nav className={styles.routeRail} aria-label="URAI launch route chain">
        {routeRail.map(([label, href]) => (
          <Link key={href} href={href} data-active={label === "Home" ? "true" : "false"}>{label}</Link>
        ))}
      </nav>
    </main>
  );
}

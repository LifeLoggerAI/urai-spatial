"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const HOME_PATHS = new Set(["/", "/home", "/ascent"]);
const focusHref = "/focus?memoryId=quiet-reset";
const replayHref = "/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread";
const beacons = ["one", "two", "three", "four", "five", "six"];
const portals = [
  ["life", "/life-map", "Open my world", "Life Map", "34 stars awake"],
  ["focus", focusHref, "Hold one star", "Focus", "quiet-reset ready"],
  ["replay", replayHref, "Move the thread", "Replay", "embodied path online"],
  ["mirror", "/mirror", "Reflect", "Mirror", "identity lens"],
  ["passport", "/passport", "Carry consent", "Passport", "private by default"],
  ["status", "/status", "Check field", "Status", "systems alive"],
] as const;

export default function HomeSpatialWorldFinal() {
  const pathname = usePathname();
  const [orbOpen, setOrbOpen] = useState(false);
  if (!pathname || !HOME_PATHS.has(pathname)) return null;

  return (
    <section className="urai-home-spatial-world-final" data-home-world-owner="HomeSpatialWorldFinal" aria-label="URAI Spatial Genesis Home World">
      <div className="urai-home-spatial-world-final__sky" />
      <div className="urai-home-spatial-world-final__skyband urai-home-spatial-world-final__skyband--one" />
      <div className="urai-home-spatial-world-final__skyband urai-home-spatial-world-final__skyband--two" />
      <div className="urai-home-spatial-world-final__skyband urai-home-spatial-world-final__skyband--three" />
      <div className="urai-home-spatial-world-final__haze" />
      <div className="urai-home-spatial-world-final__horizon" />
      <div className="urai-home-spatial-world-final__terrain" />
      <div className="urai-home-spatial-world-final__shelf" />
      <div className="urai-home-spatial-world-final__pedestal" />
      <div className="urai-home-spatial-world-final__path" />
      <div className="urai-home-spatial-world-final__avatar" aria-hidden="true">
        <span className="urai-home-spatial-world-final__avatar-core" />
        <span className="urai-home-spatial-world-final__avatar-body" />
        <span className="urai-home-spatial-world-final__avatar-glow" />
      </div>
      <div className="urai-home-spatial-world-final__beacons" aria-hidden="true">
        {beacons.map((name) => (
          <span
            key={name}
            className={`urai-home-spatial-world-final__beacon urai-home-spatial-world-final__beacon--${name}`}
          />
        ))}
      </div>
      <nav className="urai-home-spatial-world-final__portals" aria-label="URAI Home World route portals">
        {portals.map(([id, href, eyebrow, label, detail]) => (
          <Link key={id} href={href} className={`urai-home-spatial-world-final__portal urai-home-spatial-world-final__portal--${id}`} data-urai-audit-action={`home-world-portal-${id}`}>
            <span className="urai-home-spatial-world-final__portal-light" aria-hidden="true" />
            <small>{eyebrow}</small>
            <strong>{label}</strong>
            <em>{detail}</em>
          </Link>
        ))}
      </nav>
      <button type="button" accessKey="o" className="urai-home-spatial-world-final__orb-button" aria-expanded={orbOpen} aria-controls="urai-orb-companion-panel" onClick={() => setOrbOpen((open) => !open)}>
        <span className="urai-home-spatial-world-final__orb-shell" aria-hidden="true" />
        <span className="urai-home-spatial-world-final__orb-label">Open URAI orb companion</span>
      </button>
      <aside id="urai-orb-companion-panel" className="urai-home-spatial-world-final__orb-panel" data-open={orbOpen ? "true" : "false"} aria-live="polite">
        <p>URAI orb companion</p>
        <strong>Choose a path without leaving the world.</strong>
        <div><Link href="/life-map">Open Life Map</Link><Link href={focusHref}>Open Focus</Link><Link href="/privacy-controls">Privacy controls</Link></div>
      </aside>
      <div className="urai-home-spatial-world-final__foreground" />
    </section>
  );
}

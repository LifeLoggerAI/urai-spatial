"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const focusHref = "/focus?memoryId=quiet-reset";
const replayHref = "/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread";

const portals = [
  { id: "life", href: "/life-map", eyebrow: "Open my world", label: "Life Map", detail: "34 stars awake" },
  { id: "focus", href: focusHref, eyebrow: "Hold one star", label: "Focus", detail: "quiet-reset ready" },
  { id: "replay", href: replayHref, eyebrow: "Walk the thread", label: "Replay", detail: "embodied path online" },
  { id: "mirror", href: "/mirror", eyebrow: "Reflect", label: "Mirror", detail: "identity lens" },
  { id: "passport", href: "/passport", eyebrow: "Carry consent", label: "Passport", detail: "private by default" },
  { id: "status", href: "/status", eyebrow: "Check field", label: "Status", detail: "systems alive" },
] as const;

const stars = Array.from({ length: 44 }, (_, index) => index);

export default function HomeSpatialWorldFinal() {
  const [orbOpen, setOrbOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        setOrbOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setOrbOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="urai-genesis-home" aria-label="URAI Spatial Genesis Home World">
      <a className="urai-genesis-home__skip" href="#home-routes">Skip to routes</a>

      <div className="urai-genesis-home__world" aria-hidden="true">
        <div className="urai-genesis-home__sky" />
        <div className="urai-genesis-home__aurora urai-genesis-home__aurora--one" />
        <div className="urai-genesis-home__aurora urai-genesis-home__aurora--two" />
        <div className="urai-genesis-home__ceiling">
          {stars.map((star) => (
            <span key={star} className={`urai-genesis-home__star urai-genesis-home__star--${(star % 12) + 1}`} />
          ))}
        </div>
        <div className="urai-genesis-home__far-ring urai-genesis-home__far-ring--left" />
        <div className="urai-genesis-home__far-ring urai-genesis-home__far-ring--right" />
        <div className="urai-genesis-home__horizon-glow" />
        <div className="urai-genesis-home__horizon-line" />
        <div className="urai-genesis-home__mountains" />
        <div className="urai-genesis-home__mist" />
        <div className="urai-genesis-home__ground" />
        <div className="urai-genesis-home__ground-grid" />
        <div className="urai-genesis-home__route-path urai-genesis-home__route-path--one" />
        <div className="urai-genesis-home__route-path urai-genesis-home__route-path--two" />
        <div className="urai-genesis-home__route-path urai-genesis-home__route-path--three" />
        <div className="urai-genesis-home__plinth" />
        <div className="urai-genesis-home__plinth-light" />
        <div className="urai-genesis-home__reflection" />
        <div className="urai-genesis-home__body">
          <span className="urai-genesis-home__body-aura" />
          <span className="urai-genesis-home__body-core" />
          <span className="urai-genesis-home__body-column" />
          <span className="urai-genesis-home__body-shadow" />
        </div>
      </div>

      <section className="urai-genesis-home__hero" aria-labelledby="urai-home-title">
        <div className="urai-genesis-home__status-pill">
          <span />
          URAI SPATIAL · HOME WORLD
        </div>

        <p className="urai-genesis-home__micro">Private spatial memory sanctuary</p>

        <h1 id="urai-home-title">
          Own your life.
          <span>Step inside yourself.</span>
        </h1>

        <p className="urai-genesis-home__copy">
          Your memories, focus, replay, identity, and consent live in one private world.
          Start in the Life Map, open one star, then carry the same thread through Focus,
          Replay, Passport, Mirror, and Status.
        </p>

        <div className="urai-genesis-home__actions" aria-label="Primary URAI actions">
          <Link className="urai-genesis-home__cta urai-genesis-home__cta--primary" href="/life-map">
            Open my world
          </Link>
          <Link className="urai-genesis-home__cta" href={focusHref}>
            Open Focus
          </Link>
          <Link className="urai-genesis-home__cta" href={replayHref}>
            Start Replay
          </Link>
        </div>
      </section>

      <div className="urai-genesis-home__memory-orbit" aria-label="Life Map status">
        <strong>34 stars awake</strong>
        <span>Life Map online</span>
      </div>

      <button
        type="button"
        className="urai-genesis-home__orb"
        aria-label="Open URAI orb companion"
        aria-expanded={orbOpen}
        aria-controls="urai-orb-companion-panel"
        onClick={() => setOrbOpen((open) => !open)}
      >
        <span className="urai-genesis-home__orb-shell" />
        <span className="urai-genesis-home__orb-ring" />
        <span className="urai-genesis-home__orb-label">Orb companion</span>
      </button>

      <aside
        id="urai-orb-companion-panel"
        className="urai-genesis-home__orb-panel"
        data-open={orbOpen ? "true" : "false"}
        aria-live="polite"
      >
        <p>URAI orb companion</p>
        <strong>Choose a path without leaving the world.</strong>
        <div>
          <Link href="/life-map">Open Life Map</Link>
          <Link href={focusHref}>Open Focus</Link>
          <Link href="/privacy-controls">Privacy controls</Link>
        </div>
      </aside>

      <nav id="home-routes" className="urai-genesis-home__portals" aria-label="URAI Home World route portals">
        {portals.map((portal) => (
          <Link
            key={portal.id}
            href={portal.href}
            className={`urai-genesis-home__portal urai-genesis-home__portal--${portal.id}`}
          >
            <span className="urai-genesis-home__portal-light" aria-hidden="true" />
            <small>{portal.eyebrow}</small>
            <strong>{portal.label}</strong>
            <em>{portal.detail}</em>
          </Link>
        ))}
      </nav>

      <div className="urai-genesis-home__bottom-dock" aria-label="Secondary routes">
        <Link href="/unwind">Unwind</Link>
        <Link href="/ascent">Ascent</Link>
        <Link href="/privacy-controls">Privacy</Link>
      </div>
    </main>
  );
}

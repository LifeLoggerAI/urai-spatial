"use client";

import Link from "next/link";
import type { PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const focusHref = "/focus?memoryId=chapter-becoming";
const replayHref = "/replay?memoryId=chapter-becoming&manifestId=replay-chamber-thread";

const portals = [
  {
    id: "life",
    href: "/life-map",
    eyebrow: "Open your constellation",
    label: "Life Map",
    detail: "enter the living map",
  },
  {
    id: "focus",
    href: focusHref,
    eyebrow: "Hold one memory",
    label: "Focus",
    detail: "selected star waiting",
  },
  {
    id: "replay",
    href: replayHref,
    eyebrow: "Step through time",
    label: "Replay",
    detail: "memory chamber ready",
  },
  {
    id: "mirror",
    href: "/mirror",
    eyebrow: "See the pattern",
    label: "Mirror",
    detail: "reflection realm",
  },
  {
    id: "passport",
    href: "/passport",
    eyebrow: "Carry consent",
    label: "Passport",
    detail: "private by default",
  },
  {
    id: "status",
    href: "/status",
    eyebrow: "Check the field",
    label: "Status",
    detail: "systems alive",
  },
] as const;

const stars = Array.from({ length: 72 }, (_, index) => index);
const memoryDust = Array.from({ length: 20 }, (_, index) => index);
const portalRings = Array.from({ length: 4 }, (_, index) => index);

export default function HomeSpatialWorldFinal() {
  const homeRef = useRef<HTMLElement | null>(null);
  const [orbOpen, setOrbOpen] = useState(false);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const element = homeRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    element.style.setProperty("--pointer-x", `${x * 28}px`);
    element.style.setProperty("--pointer-y", `${y * 18}px`);
    element.style.setProperty("--tilt-x", `${y * -3.5}deg`);
    element.style.setProperty("--tilt-y", `${x * 4.5}deg`);
    element.style.setProperty("--glow-x", `${50 + x * 18}%`);
    element.style.setProperty("--glow-y", `${35 + y * 14}%`);
  }, []);

  const resetPointer = useCallback(() => {
    const element = homeRef.current;
    if (!element) return;

    element.style.setProperty("--pointer-x", "0px");
    element.style.setProperty("--pointer-y", "0px");
    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
    element.style.setProperty("--glow-x", "50%");
    element.style.setProperty("--glow-y", "35%");
  }, []);

  useEffect(() => {
    resetPointer();

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
  }, [resetPointer]);

  return (
    <main
      ref={homeRef}
      className="urai-genesis-home"
      aria-label="URAI Home World"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <a className="urai-genesis-home__skip" href="#home-routes">
        Skip to world routes
      </a>

      <div className="urai-genesis-home__world" aria-hidden="true">
        <div className="urai-genesis-home__sky" />
        <div className="urai-genesis-home__deep-haze urai-genesis-home__deep-haze--one" />
        <div className="urai-genesis-home__deep-haze urai-genesis-home__deep-haze--two" />
        <div className="urai-genesis-home__aurora urai-genesis-home__aurora--one" />
        <div className="urai-genesis-home__aurora urai-genesis-home__aurora--two" />
        <div className="urai-genesis-home__aurora urai-genesis-home__aurora--three" />

        <div className="urai-genesis-home__ceiling">
          {stars.map((star) => (
            <span
              key={star}
              className={`urai-genesis-home__star urai-genesis-home__star--${(star % 18) + 1}`}
            />
          ))}
        </div>

        <div className="urai-genesis-home__memory-dust">
          {memoryDust.map((particle) => (
            <span
              key={particle}
              className={`urai-genesis-home__dust urai-genesis-home__dust--${(particle % 10) + 1}`}
            />
          ))}
        </div>

        <div className="urai-genesis-home__far-ring urai-genesis-home__far-ring--left" />
        <div className="urai-genesis-home__far-ring urai-genesis-home__far-ring--right" />
        <div className="urai-genesis-home__far-ring urai-genesis-home__far-ring--center" />

        <div className="urai-genesis-home__horizon-glow" />
        <div className="urai-genesis-home__horizon-line" />
        <div className="urai-genesis-home__distant-silhouette" />
        <div className="urai-genesis-home__mist urai-genesis-home__mist--back" />
        <div className="urai-genesis-home__mist urai-genesis-home__mist--front" />

        <div className="urai-genesis-home__ground" />
        <div className="urai-genesis-home__ground-grid" />
        <div className="urai-genesis-home__ground-rings">
          {portalRings.map((ring) => (
            <span key={ring} className={`urai-genesis-home__ground-ring urai-genesis-home__ground-ring--${ring + 1}`} />
          ))}
        </div>

        <div className="urai-genesis-home__route-path urai-genesis-home__route-path--one" />
        <div className="urai-genesis-home__route-path urai-genesis-home__route-path--two" />
        <div className="urai-genesis-home__route-path urai-genesis-home__route-path--three" />
        <div className="urai-genesis-home__route-path urai-genesis-home__route-path--four" />

        <div className="urai-genesis-home__plinth" />
        <div className="urai-genesis-home__plinth-light" />
        <div className="urai-genesis-home__reflection" />

        <div className="urai-genesis-home__body">
          <span className="urai-genesis-home__body-aura" />
          <span className="urai-genesis-home__body-orbit urai-genesis-home__body-orbit--one" />
          <span className="urai-genesis-home__body-orbit urai-genesis-home__body-orbit--two" />
          <span className="urai-genesis-home__body-core" />
          <span className="urai-genesis-home__body-column" />
          <span className="urai-genesis-home__body-feet" />
          <span className="urai-genesis-home__body-shadow" />
        </div>

        <div className="urai-genesis-home__world-vignette" />
      </div>

      <section className="urai-genesis-home__hero" aria-labelledby="urai-home-title">
        <div className="urai-genesis-home__status-pill">
          <span />
          URAI · HOME WORLD
        </div>

        <p className="urai-genesis-home__micro">Private spatial memory sanctuary</p>

        <h1 id="urai-home-title">
          Own your life.
          <span>Step inside yourself.</span>
        </h1>

        <p className="urai-genesis-home__copy">
          Start in your Life Map, open one star, and carry the same living thread through
          Focus, Replay, Mirror, Passport, and Status.
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
        <strong>Life Map online</strong>
        <span>selected star ready</span>
      </div>

      <button
        type="button"
        className="urai-genesis-home__orb"
        aria-label="Open URAI orb companion"
        aria-expanded={orbOpen}
        aria-controls="urai-orb-companion-panel"
        onClick={() => setOrbOpen((open) => !open)}
      >
        <span className="urai-genesis-home__orb-aura" />
        <span className="urai-genesis-home__orb-shell" />
        <span className="urai-genesis-home__orb-ring urai-genesis-home__orb-ring--outer" />
        <span className="urai-genesis-home__orb-ring urai-genesis-home__orb-ring--inner" />
        <span className="urai-genesis-home__orb-label">Orb guide · press O</span>
      </button>

      <aside
        id="urai-orb-companion-panel"
        className="urai-genesis-home__orb-panel"
        data-open={orbOpen ? "true" : "false"}
        aria-live="polite"
      >
        <p>URAI orb guide</p>
        <strong>Choose a path and stay inside the same world.</strong>
        <div>
          <Link href="/life-map">Life Map</Link>
          <Link href={focusHref}>Focus</Link>
          <Link href={replayHref}>Replay</Link>
          <Link href="/mirror">Mirror</Link>
          <Link href="/passport">Passport</Link>
          <Link href="/status">Status</Link>
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
        <Link href="/privacy">Privacy</Link>
      </div>
    </main>
  );
}

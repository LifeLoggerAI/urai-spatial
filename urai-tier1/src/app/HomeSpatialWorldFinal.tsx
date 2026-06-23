"use client";

import Link from "next/link";
import "@/spatial/ground/GroundWorldExperience.module.css";
import type { PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const portals = [
  {
    id: "world",
    href: "/world",
    eyebrow: "Enter the ground",
    label: "World",
    detail: "council and objects live here",
  },
  {
    id: "life",
    href: "/life-map",
    eyebrow: "Ascend through sky",
    label: "Life Map",
    detail: "memory constellation above",
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
      aria-label="URAI Home World threshold"
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

      <Link className="urai-genesis-home__threshold-gate urai-genesis-home__threshold-gate--ground" href="/world">
        <span>Click the ground</span>
        <strong>Enter the living world where council avatars and real-life objects exist.</strong>
      </Link>

      <Link className="urai-genesis-home__threshold-gate urai-genesis-home__threshold-gate--sky" href="/life-map">
        <span>Click the sky</span>
        <strong>Ascend through the clouds into your Life Map.</strong>
      </Link>

      <section className="urai-genesis-home__hero" aria-labelledby="urai-home-title">
        <div className="urai-genesis-home__status-pill">
          <span />
          URAI · HOME WORLD
        </div>

        <p className="urai-genesis-home__micro">Ground life below · sky memory above</p>

        <h1 id="urai-home-title">
          Own your life.
          <span>Step inside yourself.</span>
        </h1>

        <p className="urai-genesis-home__copy">
          The ground holds your living world: council, objects, places, tools, and routines.
          The sky opens your Life Map, where memory becomes constellation.
        </p>

        <div className="urai-genesis-home__actions" aria-label="Primary URAI threshold actions">
          <Link className="urai-genesis-home__cta urai-genesis-home__cta--primary" href="/world">
            Enter Ground World
          </Link>
          <Link className="urai-genesis-home__cta" href="/life-map">
            Ascend to Life Map
          </Link>
        </div>
      </section>

      <div className="urai-genesis-home__memory-orbit" aria-label="Home threshold status">
        <strong>Threshold online</strong>
        <span>ground life · sky memory</span>
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
        <strong>The ground is your embodied life. The sky is your memory constellation.</strong>
        <div>
          <Link href="/world">Ground World</Link>
          <Link href="/life-map">Life Map</Link>
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

"use client";

import Link from "next/link";
import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const portals = [
  { id: "world", href: "/ground?from=home", eyebrow: "Descend through ground", label: "Ground", detail: "private workforce and real-life objects" },
  { id: "life", href: "/life-map?from=home-sky", eyebrow: "Ascend through sky", label: "Life Map", detail: "camera enters memory constellation above" },
  { id: "mirror", href: "/mirror", eyebrow: "See the pattern", label: "Mirror", detail: "reflection realm" },
  { id: "passport", href: "/passport", eyebrow: "Carry consent", label: "Passport", detail: "private by default" },
  { id: "status", href: "/status", eyebrow: "Check the field", label: "Status", detail: "systems alive" },
] as const;

const stars = Array.from({ length: 72 }, (_, index) => index);
const memoryDust = Array.from({ length: 20 }, (_, index) => index);
const portalRings = Array.from({ length: 4 }, (_, index) => index);
const HOME_CAMERA_ASCENT_MS = 760;
const HOME_GROUND_DESCENT_MS = 620;

type HomeTransitionTarget = 'ground' | 'sky' | 'orb';

const thresholdBaseStyle: CSSProperties = {
  position: "absolute",
  zIndex: 6,
  display: "grid",
  gap: 6,
  width: "max-content",
  maxWidth: "min(340px, calc(100vw - 40px))",
  padding: "13px 15px",
  border: "1px solid rgba(220, 250, 255, .2)",
  borderRadius: 22,
  color: "rgba(248, 253, 255, .95)",
  background: "rgba(2, 8, 20, .48)",
  boxShadow: "0 22px 70px rgba(0,0,0,.28), 0 0 48px rgba(103,232,249,.08)",
  backdropFilter: "blur(20px)",
  textDecoration: "none",
};

const thresholdGroundStyle: CSSProperties = {
  ...thresholdBaseStyle,
  left: "clamp(18px, 6vw, 92px)",
  bottom: "clamp(90px, 16svh, 150px)",
};

const thresholdSkyStyle: CSSProperties = {
  ...thresholdBaseStyle,
  right: "clamp(18px, 6vw, 92px)",
  top: "clamp(118px, 22svh, 210px)",
};

const thresholdEyebrowStyle: CSSProperties = {
  color: "rgba(154, 238, 255, .92)",
  fontSize: ".68rem",
  fontWeight: 950,
  letterSpacing: ".12em",
  textTransform: "uppercase",
};

const thresholdLabelStyle: CSSProperties = {
  fontSize: ".96rem",
  lineHeight: 1.2,
};

export default function HomeSpatialWorldFinal() {
  const homeRef = useRef<HTMLElement | null>(null);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [orbOpen, setOrbOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<HomeTransitionTarget | null>(null);

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
        setTransitionTarget('orb');
        setOrbOpen((open) => !open);
      }
      if (event.key === "Escape") {
        if (navigationTimerRef.current) {
          clearTimeout(navigationTimerRef.current);
          navigationTimerRef.current = null;
        }
        setOrbOpen(false);
        setTransitionTarget(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    };
  }, [resetPointer]);

  function primeTransition(target: HomeTransitionTarget) {
    setTransitionTarget(target);
  }

  function navigateThroughThreshold(event: MouseEvent<HTMLAnchorElement>, target: Exclude<HomeTransitionTarget, 'orb'>, href: string) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

    primeTransition(target);
    setOrbOpen(false);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    event.preventDefault();
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = setTimeout(() => {
      window.location.assign(href);
    }, target === 'sky' ? HOME_CAMERA_ASCENT_MS : HOME_GROUND_DESCENT_MS);
  }

  return (
    <main
      ref={homeRef}
      className="urai-genesis-home urai-home-spatial-world-final"
      aria-label="URAI Home World threshold"
      data-urai-route="genesis-home-world"
      data-launch-surface="aaa-final-home-sky-ground-orb-body-portals"
      data-transition-target={transitionTarget ?? 'idle'}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <a className="urai-genesis-home__skip" href="#home-routes">Skip to world routes</a>

      <div className="urai-genesis-home__world" aria-hidden="true">
        <div className="urai-genesis-home__sky" />
        <div className="urai-genesis-home__deep-haze urai-genesis-home__deep-haze--one" />
        <div className="urai-genesis-home__deep-haze urai-genesis-home__deep-haze--two" />
        <div className="urai-genesis-home__aurora urai-genesis-home__aurora--one" />
        <div className="urai-genesis-home__aurora urai-genesis-home__aurora--two" />
        <div className="urai-genesis-home__aurora urai-genesis-home__aurora--three" />
        <div className="urai-genesis-home__ceiling">
          {stars.map((star) => <span key={star} className={`urai-genesis-home__star urai-genesis-home__star--${(star % 18) + 1}`} />)}
        </div>
        <div className="urai-genesis-home__memory-dust">
          {memoryDust.map((particle) => <span key={particle} className={`urai-genesis-home__dust urai-genesis-home__dust--${(particle % 10) + 1}`} />)}
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
          {portalRings.map((ring) => <span key={ring} className={`urai-genesis-home__ground-ring urai-genesis-home__ground-ring--${ring + 1}`} />)}
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

      {transitionTarget === 'sky' ? (
        <div className="urai-genesis-home__camera-ascent-signal" aria-hidden="true">
          <span />
          <strong>camera ascending</strong>
        </div>
      ) : null}

      <Link
        className="urai-genesis-home__threshold-gate urai-genesis-home__threshold-gate--ground"
        href="/ground?from=home"
        style={thresholdGroundStyle}
        onPointerDown={() => primeTransition('ground')}
        onClick={(event) => navigateThroughThreshold(event, 'ground', '/ground?from=home')}
      >
        <span style={thresholdEyebrowStyle}>Click the ground</span>
        <strong style={thresholdLabelStyle}>Descend into the grounded life layer where council avatars and real-life objects exist.</strong>
      </Link>

      <Link
        className="urai-genesis-home__threshold-gate urai-genesis-home__threshold-gate--sky"
        href="/life-map?from=home-sky"
        style={thresholdSkyStyle}
        onPointerDown={() => primeTransition('sky')}
        onClick={(event) => navigateThroughThreshold(event, 'sky', '/life-map?from=home-sky')}
      >
        <span style={thresholdEyebrowStyle}>Click the sky</span>
        <strong style={thresholdLabelStyle}>Camera ascends into your Life Map. Avatar and orb stay anchored in Home/Ground.</strong>
      </Link>

      <section className="urai-genesis-home__hero" aria-labelledby="urai-home-title">
        <div className="urai-genesis-home__status-pill"><span />URAI · HOME WORLD</div>
        <p className="urai-genesis-home__micro">Ground body below · memory camera above</p>
        <h1 id="urai-home-title">Own your life.<span>Step inside yourself.</span></h1>
        <p className="urai-genesis-home__copy">
          The ground holds your embodied life: council, objects, places, tools, and routines. The sky opens the camera into your Life Map, where memory becomes constellation.
        </p>
        <div className="urai-genesis-home__actions" aria-label="Primary URAI threshold actions">
          <Link className="urai-genesis-home__cta urai-genesis-home__cta--primary" href="/ground?from=home" onPointerDown={() => primeTransition('ground')} onClick={(event) => navigateThroughThreshold(event, 'ground', '/ground?from=home')}>Descend to Ground</Link>
          <Link className="urai-genesis-home__cta" href="/life-map?from=home-sky" onPointerDown={() => primeTransition('sky')} onClick={(event) => navigateThroughThreshold(event, 'sky', '/life-map?from=home-sky')}>Ascend Camera to Life Map</Link>
        </div>
      </section>

      <div className="urai-genesis-home__memory-orbit" aria-label="Home threshold status"><strong>Threshold online</strong><span>body grounded · camera ascends</span></div>

      <button type="button" className="urai-genesis-home__orb" aria-label="Open URAI orb companion" aria-expanded={orbOpen} aria-controls="urai-orb-companion-panel" onClick={() => { primeTransition('orb'); setOrbOpen((open) => !open); }}>
        <span className="urai-genesis-home__orb-aura" />
        <span className="urai-genesis-home__orb-shell" />
        <span className="urai-genesis-home__orb-ring urai-genesis-home__orb-ring--outer" />
        <span className="urai-genesis-home__orb-ring urai-genesis-home__orb-ring--inner" />
        <span className="urai-genesis-home__orb-label">Orb guide · press O</span>
      </button>

      <aside id="urai-orb-companion-panel" className="urai-genesis-home__orb-panel" data-open={orbOpen ? "true" : "false"} aria-live="polite">
        <p>URAI orb guide</p>
        <strong>The orb stays grounded here. It opens in place; the memory camera ascends separately.</strong>
        <div>
          <Link href="/ground?from=orb">Ground World</Link>
          <Link href="/life-map?from=orb-sky">Life Map Camera</Link>
          <Link href="/mirror">Mirror</Link>
          <Link href="/passport">Passport</Link>
          <Link href="/status">Status</Link>
        </div>
      </aside>

      <nav id="home-routes" className="urai-genesis-home__portals" aria-label="URAI Home World route portals">
        {portals.map((portal) => (
          <Link
            key={portal.href}
            href={portal.href}
            className={`urai-genesis-home__portal urai-genesis-home__portal--${portal.id}`}
            onPointerDown={() => portal.id === 'world' ? primeTransition('ground') : portal.id === 'life' ? primeTransition('sky') : undefined}
            onClick={(event) => portal.id === 'world' ? navigateThroughThreshold(event, 'ground', portal.href) : portal.id === 'life' ? navigateThroughThreshold(event, 'sky', portal.href) : undefined}
          >
            <span className="urai-genesis-home__portal-light" aria-hidden="true" />
            <small>{portal.eyebrow}</small>
            <strong>{portal.label}</strong>
            <em>{portal.detail}</em>
          </Link>
        ))}
      </nav>

      <div className="urai-genesis-home__bottom-dock" aria-label="Secondary routes">
        <Link href="/unwind?to=home">Unwind</Link>
        <Link href="/ascent">Ascent</Link>
        <Link href="/privacy-controls">Privacy</Link>
      </div>
    </main>
  );
}

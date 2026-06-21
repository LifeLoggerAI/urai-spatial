"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

export type LaunchHomeSceneMode = "home" | "ascent" | "unwind";

type Props = {
  sceneMode?: LaunchHomeSceneMode;
};

const launchMemoryId = "quiet-reset";

const modeCopy: Record<LaunchHomeSceneMode, {
  eyebrow: string;
  title: string;
  lead: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}> = {
  home: {
    eyebrow: "URAI Spatial · Private world online",
    title: "Step inside yourself.",
    lead: "Enter a living memory world where Life Map, Focus, Replay, Mirror, Passport, and privacy controls feel connected from the first touch.",
    primaryLabel: "Open my world",
    primaryHref: "/life-map",
    secondaryLabel: "Focus a memory",
    secondaryHref: `/focus?memoryId=${launchMemoryId}`,
  },
  ascent: {
    eyebrow: "Ascent · sky portal active",
    title: "Rise into the Life Map.",
    lead: "The home field opens upward into your constellation. This transition is intentional: leave the ground, enter the memory sky, choose a star.",
    primaryLabel: "Enter Life Map",
    primaryHref: "/life-map?transition=ascent",
    secondaryLabel: "Return home",
    secondaryHref: "/home",
  },
  unwind: {
    eyebrow: "Unwind · safe return path",
    title: "Come back gently.",
    lead: "Replay, Focus, and Life Map always have a way out. Unwind settles the scene, preserves context, and returns you to the next safe layer.",
    primaryLabel: "Back to Life Map",
    primaryHref: "/life-map",
    secondaryLabel: "Home field",
    secondaryHref: "/home",
  },
};

function rememberLaunchMemory() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("urai-lifemap-selected-memory-id", launchMemoryId);
}

export default function LaunchHomeScene({ sceneMode = "home" }: Props) {
  const router = useRouter();
  const copy = modeCopy[sceneMode] ?? modeCopy.home;
  const routeState = useMemo(() => {
    if (sceneMode === "ascent") return { label: "Portal", value: "opening" };
    if (sceneMode === "unwind") return { label: "Return", value: "settled" };
    return { label: "World", value: "ready" };
  }, [sceneMode]);

  useEffect(() => {
    rememberLaunchMemory();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push(sceneMode === "home" ? "/home" : "/unwind");
      }
      if (event.key === "Enter" && sceneMode === "ascent") {
        event.preventDefault();
        router.push("/life-map?transition=ascent");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, sceneMode]);

  return (
    <section className="urai-launch-home" data-testid="urai-launch-home" data-scene-mode={sceneMode} aria-label="URAI Spatial launch world">
      <div className="urai-launch-home__sky" aria-hidden="true">
        <span className="urai-launch-home__moon" />
        <span className="urai-launch-home__ring ring-a" />
        <span className="urai-launch-home__ring ring-b" />
        <span className="urai-launch-home__ring ring-c" />
        <span className="urai-launch-home__constellation constellation-a" />
        <span className="urai-launch-home__constellation constellation-b" />
        <span className="urai-launch-home__constellation constellation-c" />
        <span className="urai-launch-home__orb" />
        <span className="urai-launch-home__ground" />
      </div>

      <header className="urai-launch-home__topbar" aria-label="URAI Spatial navigation">
        <Link href="/home" className="urai-launch-home__brand" onClick={rememberLaunchMemory}>
          <span className="urai-launch-home__sigil" aria-hidden="true" />
          <span><strong>URAI</strong><small>Spatial</small></span>
        </Link>
        <nav aria-label="Primary routes">
          <Link href="/life-map">Life Map</Link>
          <Link href={`/focus?memoryId=${launchMemoryId}`} onClick={rememberLaunchMemory}>Focus</Link>
          <Link href={`/replay?memoryId=${launchMemoryId}`} onClick={rememberLaunchMemory}>Replay</Link>
          <Link href="/passport">Passport</Link>
          <Link href="/privacy-controls">Privacy</Link>
        </nav>
      </header>

      <main className="urai-launch-home__content">
        <section className="urai-launch-home__hero">
          <p className="urai-launch-home__eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="urai-launch-home__lead">{copy.lead}</p>
          <div className="urai-launch-home__actions">
            <Link className="urai-launch-home__primary" href={copy.primaryHref} onClick={rememberLaunchMemory}>{copy.primaryLabel}</Link>
            <Link className="urai-launch-home__secondary" href={copy.secondaryHref} onClick={rememberLaunchMemory}>{copy.secondaryLabel}</Link>
          </div>
        </section>

        <aside className="urai-launch-home__panel" aria-label="URAI route previews">
          <div className="urai-launch-home__status">
            <span>{routeState.label}</span>
            <strong>{routeState.value}</strong>
          </div>
          <Link href="/life-map" className="urai-launch-home__route-card">
            <span>✦</span><strong>Life Map</strong><small>Explore the memory constellation.</small>
          </Link>
          <Link href={`/focus?memoryId=${launchMemoryId}`} onClick={rememberLaunchMemory} className="urai-launch-home__route-card">
            <span>◉</span><strong>Focus</strong><small>Open one rich memory surface.</small>
          </Link>
          <Link href={`/replay?memoryId=${launchMemoryId}`} onClick={rememberLaunchMemory} className="urai-launch-home__route-card">
            <span>▶</span><strong>Replay</strong><small>Play the cinematic memory sequence.</small>
          </Link>
          <Link href="/unwind" className="urai-launch-home__route-card">
            <span>↺</span><strong>Unwind</strong><small>Return without losing context.</small>
          </Link>
        </aside>
      </main>

      <footer className="urai-launch-home__footer">
        <span>Private by default</span>
        <span>User controlled memory state</span>
        <span>ESC returns safely</span>
      </footer>

      <style jsx>{`
        .urai-launch-home {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          color: #eef8ff;
          background:
            radial-gradient(circle at 50% 34%, rgba(125, 211, 252, 0.22), transparent 22%),
            radial-gradient(circle at 82% 16%, rgba(168, 85, 247, 0.22), transparent 26%),
            radial-gradient(circle at 18% 82%, rgba(45, 212, 191, 0.13), transparent 28%),
            linear-gradient(160deg, #020617 0%, #071126 45%, #1b1246 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          isolation: isolate;
        }

        .urai-launch-home__sky,
        .urai-launch-home__sky span {
          position: absolute;
          pointer-events: none;
        }

        .urai-launch-home__sky {
          inset: 0;
          z-index: 0;
        }

        .urai-launch-home__moon {
          width: clamp(160px, 24vw, 320px);
          aspect-ratio: 1;
          border-radius: 999px;
          left: 50%;
          top: 12%;
          transform: translateX(-50%);
          background:
            radial-gradient(circle at 34% 28%, rgba(255,255,255,0.92), rgba(219,234,254,0.38) 32%, rgba(125,211,252,0.08) 64%, transparent 70%);
          filter: blur(0.2px) drop-shadow(0 0 80px rgba(125,211,252,0.46));
          opacity: 0.82;
        }

        .urai-launch-home__ring {
          left: 50%;
          top: 42%;
          width: min(92vw, 980px);
          height: min(42vw, 360px);
          border: 1px solid rgba(186, 230, 253, 0.22);
          border-radius: 999px;
          transform: translate(-50%, -50%) rotate(-9deg);
          box-shadow: 0 0 80px rgba(103, 232, 249, 0.08), inset 0 0 80px rgba(139, 92, 246, 0.05);
        }

        .ring-b { transform: translate(-50%, -50%) rotate(13deg) scale(0.78); opacity: 0.64; }
        .ring-c { transform: translate(-50%, -50%) rotate(34deg) scale(0.54); opacity: 0.44; }

        .urai-launch-home__constellation {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #e0f2fe;
          box-shadow:
            52px 24px 0 rgba(186,230,253,0.9),
            102px -18px 0 rgba(167,243,208,0.86),
            148px 38px 0 rgba(216,180,254,0.88),
            210px -8px 0 rgba(125,211,252,0.92),
            0 0 24px rgba(125,211,252,0.8),
            100px 0 90px rgba(139,92,246,0.22);
          animation: uraiConstellationFloat 9s ease-in-out infinite alternate;
        }

        .constellation-a { left: 18%; top: 28%; }
        .constellation-b { right: 28%; top: 20%; transform: scale(0.72); animation-delay: -2s; }
        .constellation-c { right: 18%; bottom: 28%; transform: scale(0.54); animation-delay: -4s; }

        .urai-launch-home__orb {
          left: 50%;
          bottom: 17%;
          width: clamp(150px, 22vw, 270px);
          aspect-ratio: 1;
          transform: translateX(-50%);
          border-radius: 999px;
          background:
            radial-gradient(circle at 42% 32%, rgba(255,255,255,0.92), rgba(125,211,252,0.36) 22%, rgba(59,130,246,0.16) 50%, rgba(2,6,23,0.08) 72%),
            radial-gradient(circle, rgba(103,232,249,0.22), transparent 70%);
          box-shadow: 0 0 90px rgba(103,232,249,0.34), inset 0 0 70px rgba(255,255,255,0.13);
          animation: uraiOrbBreath 5.8s ease-in-out infinite alternate;
        }

        .urai-launch-home__ground {
          inset: auto -10% -18% -10%;
          height: 42%;
          border-radius: 50% 50% 0 0;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(103,232,249,0.2), transparent 42%),
            linear-gradient(180deg, rgba(15,23,42,0.38), rgba(2,6,23,0.92));
          border-top: 1px solid rgba(186,230,253,0.18);
        }

        .urai-launch-home__topbar {
          position: relative;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: clamp(18px, 3vw, 34px);
        }

        .urai-launch-home__brand,
        .urai-launch-home__topbar nav,
        .urai-launch-home__actions,
        .urai-launch-home__route-card,
        .urai-launch-home__footer {
          display: flex;
          align-items: center;
        }

        .urai-launch-home__brand {
          gap: 10px;
          color: inherit;
          text-decoration: none;
        }

        .urai-launch-home__sigil {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          background: radial-gradient(circle at 35% 25%, #ffffff, #67e8f9 38%, #312e81 100%);
          box-shadow: 0 0 34px rgba(103,232,249,0.42);
        }

        .urai-launch-home__brand strong,
        .urai-launch-home__brand small {
          display: block;
          line-height: 1;
        }

        .urai-launch-home__brand small { color: rgba(238,248,255,0.62); font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; font-size: 0.62rem; margin-top: 4px; }

        .urai-launch-home__topbar nav {
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .urai-launch-home__topbar a,
        .urai-launch-home__actions a,
        .urai-launch-home__route-card {
          color: inherit;
          text-decoration: none;
          border: 1px solid rgba(186,230,253,0.22);
          background: rgba(2,6,23,0.44);
          backdrop-filter: blur(16px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 60px rgba(0,0,0,0.24);
        }

        .urai-launch-home__topbar nav a {
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 0.82rem;
          font-weight: 800;
          color: rgba(238,248,255,0.82);
        }

        .urai-launch-home__content {
          position: relative;
          z-index: 30;
          min-height: calc(100svh - 160px);
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.56fr);
          align-items: end;
          gap: clamp(20px, 4vw, 64px);
          padding: clamp(28px, 6vw, 80px);
          padding-top: min(14vh, 120px);
        }

        .urai-launch-home__hero {
          max-width: 780px;
          padding: clamp(22px, 4vw, 42px);
          border: 1px solid rgba(186,230,253,0.22);
          border-radius: clamp(28px, 4vw, 46px);
          background:
            radial-gradient(circle at 12% 14%, rgba(103,232,249,0.2), transparent 34%),
            linear-gradient(145deg, rgba(2,6,23,0.78), rgba(15,23,42,0.46));
          backdrop-filter: blur(22px);
          box-shadow: 0 38px 120px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .urai-launch-home__eyebrow {
          margin: 0 0 14px;
          color: #67e8f9;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-size: 0.72rem;
        }

        .urai-launch-home h1 {
          margin: 0;
          max-width: 9ch;
          font-size: clamp(3.2rem, 8vw, 7.8rem);
          line-height: 0.86;
          letter-spacing: -0.09em;
          text-shadow: 0 20px 90px rgba(103,232,249,0.28);
        }

        .urai-launch-home__lead {
          max-width: 58ch;
          margin: 22px 0 0;
          color: rgba(238,248,255,0.78);
          font-size: clamp(1rem, 1.35vw, 1.18rem);
          line-height: 1.62;
        }

        .urai-launch-home__actions {
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 26px;
        }

        .urai-launch-home__actions a {
          border-radius: 999px;
          padding: 13px 18px;
          font-weight: 900;
        }

        .urai-launch-home__primary {
          background: linear-gradient(135deg, rgba(103,232,249,0.34), rgba(168,85,247,0.28)) !important;
          border-color: rgba(103,232,249,0.58) !important;
        }

        .urai-launch-home__panel {
          display: grid;
          gap: 12px;
          padding: 18px;
          border: 1px solid rgba(186,230,253,0.2);
          border-radius: 28px;
          background: rgba(2,6,23,0.58);
          backdrop-filter: blur(20px);
          box-shadow: 0 28px 90px rgba(0,0,0,0.34);
        }

        .urai-launch-home__status {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 14px;
          border-radius: 20px;
          background: rgba(15,23,42,0.64);
          border: 1px solid rgba(186,230,253,0.16);
        }

        .urai-launch-home__status span,
        .urai-launch-home__route-card small,
        .urai-launch-home__footer { color: rgba(238,248,255,0.64); }
        .urai-launch-home__status strong { color: #a7f3d0; }

        .urai-launch-home__route-card {
          gap: 12px;
          border-radius: 22px;
          padding: 14px;
        }

        .urai-launch-home__route-card span {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 15px;
          background: rgba(103,232,249,0.14);
          color: #bae6fd;
        }

        .urai-launch-home__route-card strong,
        .urai-launch-home__route-card small { display: block; }
        .urai-launch-home__route-card small { margin-left: auto; max-width: 150px; line-height: 1.25; }

        .urai-launch-home__footer {
          position: relative;
          z-index: 30;
          gap: 10px;
          flex-wrap: wrap;
          padding: 0 clamp(22px, 6vw, 80px) clamp(20px, 4vw, 38px);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .urai-launch-home__footer span {
          border: 1px solid rgba(186,230,253,0.14);
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(2,6,23,0.36);
        }

        [data-scene-mode="ascent"] .urai-launch-home__orb { bottom: 28%; transform: translateX(-50%) scale(0.84); }
        [data-scene-mode="ascent"] .ring-a { animation: uraiAscentRing 4.2s ease-in-out infinite alternate; }
        [data-scene-mode="unwind"] .urai-launch-home__sky { filter: saturate(0.72) brightness(0.88); }
        [data-scene-mode="unwind"] .urai-launch-home__orb { animation-duration: 7.6s; }

        @keyframes uraiOrbBreath {
          from { transform: translateX(-50%) translateY(0) scale(0.98); opacity: 0.78; }
          to { transform: translateX(-50%) translateY(-10px) scale(1.03); opacity: 1; }
        }

        @keyframes uraiConstellationFloat {
          from { transform: translateY(0) scale(1); opacity: 0.52; }
          to { transform: translateY(-12px) scale(1.04); opacity: 0.92; }
        }

        @keyframes uraiAscentRing {
          from { transform: translate(-50%, -50%) rotate(-9deg) scale(0.98); }
          to { transform: translate(-50%, -58%) rotate(-3deg) scale(1.08); }
        }

        @media (max-width: 880px) {
          .urai-launch-home__topbar { align-items: flex-start; }
          .urai-launch-home__topbar nav { max-width: 62vw; }
          .urai-launch-home__content { grid-template-columns: 1fr; align-items: start; padding: 18px; padding-top: 10vh; }
          .urai-launch-home__hero { padding: 20px; border-radius: 28px; }
          .urai-launch-home h1 { font-size: clamp(3rem, 18vw, 5.2rem); }
          .urai-launch-home__route-card small { margin-left: 0; max-width: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .urai-launch-home *, .urai-launch-home *::before, .urai-launch-home *::after { animation: none !important; transition: none !important; }
        }
      `}</style>
    </section>
  );
}

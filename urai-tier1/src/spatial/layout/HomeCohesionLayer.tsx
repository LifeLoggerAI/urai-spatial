"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type HomePortal = "none" | "orb" | "avatar" | "ground";

const portalCopy: Record<Exclude<HomePortal, "none">, { eyebrow: string; title: string; body: string; cta?: string }> = {
  orb: {
    eyebrow: "Orb Companion",
    title: "Passive companion is awake.",
    body: "The orb stays present as a spatial navigator. It can route you toward the Life Map, body portal, ground world, or return you to the home view without exposing private data.",
    cta: "Open Life Map",
  },
  avatar: {
    eyebrow: "Avatar Portal",
    title: "Body map is ready.",
    body: "The avatar portal is the entry point for head, heart, arms, and legs layers. These are framed as privacy-safe wellness and behavior signals, never as diagnosis.",
    cta: "Zoom Avatar",
  },
  ground: {
    eyebrow: "Ground World",
    title: "Place, objects, and anchors are available.",
    body: "The ground layer is the world-context portal for room anchors, object memories, routine paths, and future AR/WebXR seams.",
    cta: "Open Ground Layer",
  },
};

export function HomeCohesionLayer({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [portal, setPortal] = useState<HomePortal>("none");

  const closePortal = useCallback(() => setPortal("none"), []);
  const openSky = useCallback(() => router.push("/ascent", { scroll: false }), [router]);
  const openLifeMap = useCallback(() => router.push("/life-map?transition=sky", { scroll: false }), [router]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePortal();
      if (event.key.toLowerCase() === "o") setPortal("orb");
      if (event.key.toLowerCase() === "a") setPortal("avatar");
      if (event.key.toLowerCase() === "g") setPortal("ground");
      if (event.key.toLowerCase() === "s") openSky();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePortal, enabled, openSky]);

  if (!enabled) return null;

  const activeCopy = portal === "none" ? null : portalCopy[portal];

  return (
    <div className="home-cohesion-layer" data-urai-home-cohesion="true">
      <div className="home-passive-orb" data-urai-home-orb="passive" aria-label="URAI passive orb companion">
        <button type="button" onClick={() => setPortal("orb")} aria-label="Open orb companion layer">
          <span aria-hidden="true" />
        </button>
        <div>
          <strong>Orb awake</strong>
          <p>Passive navigator</p>
        </div>
      </div>

      <nav className="home-targets" aria-label="URAI Spatial home targets">
        <button type="button" data-urai-home-target="orb" onClick={() => setPortal("orb")}>Orb</button>
        <button type="button" data-urai-home-target="avatar" onClick={() => setPortal("avatar")}>Avatar</button>
        <button type="button" data-urai-home-target="sky" onClick={openSky}>Sky</button>
        <button type="button" data-urai-home-target="ground" onClick={() => setPortal("ground")}>Ground</button>
      </nav>

      {portal === "avatar" ? (
        <section className="home-avatar-regions" data-urai-avatar-portal="home" aria-label="Avatar body regions">
          <button type="button" data-urai-avatar-region="head">Head</button>
          <button type="button" data-urai-avatar-region="heart">Heart</button>
          <button type="button" data-urai-avatar-region="arms">Arms</button>
          <button type="button" data-urai-avatar-region="legs">Legs</button>
        </section>
      ) : null}

      {activeCopy ? (
        <aside className="home-portal-card" data-urai-home-portal={portal} aria-live="polite">
          <div className="home-portal-card__eyebrow">{activeCopy.eyebrow}</div>
          <h2>{activeCopy.title}</h2>
          <p>{activeCopy.body}</p>
          <div className="home-portal-card__actions">
            {portal === "orb" ? <button type="button" onClick={openLifeMap}>{activeCopy.cta}</button> : null}
            {portal === "avatar" ? <button type="button" onClick={() => setPortal("avatar")}>{activeCopy.cta}</button> : null}
            {portal === "ground" ? <button type="button" onClick={() => setPortal("ground")}>{activeCopy.cta}</button> : null}
            <button type="button" onClick={closePortal}>Close</button>
          </div>
        </aside>
      ) : null}

      <section className="sr-only" aria-label="Home spatial keyboard shortcuts">
        Press O for Orb, A for Avatar, S for Sky and Life Map ascent, G for Ground, or Escape to close the active portal.
      </section>

      <style jsx>{`
        .home-cohesion-layer {
          position: fixed;
          inset: 0;
          z-index: 32;
          pointer-events: none;
          color: white;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        .home-passive-orb,
        .home-targets,
        .home-portal-card,
        .home-avatar-regions {
          pointer-events: auto;
          position: absolute;
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(3, 8, 20, .58);
          backdrop-filter: blur(18px);
          box-shadow: 0 24px 80px rgba(0,0,0,.32);
        }
        .home-passive-orb {
          right: 24px;
          top: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 24px;
          padding: 12px 14px;
        }
        .home-passive-orb button {
          width: 54px;
          height: 54px;
          border: 1px solid rgba(125,239,255,.42);
          border-radius: 999px;
          background: radial-gradient(circle, #fff, #7defff 42%, rgba(65,190,255,.2) 72%);
          box-shadow: 0 0 52px rgba(125,239,255,.72);
          cursor: pointer;
        }
        .home-passive-orb span {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          box-shadow: inset 0 0 18px rgba(255,255,255,.82);
        }
        .home-passive-orb strong {
          display: block;
          font-size: 12px;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: rgba(221, 250, 255, .96);
        }
        .home-passive-orb p {
          margin: 3px 0 0;
          font-size: 12px;
          color: rgba(255,255,255,.62);
        }
        .home-targets {
          left: 50%;
          top: 24px;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          padding: 10px;
          border-radius: 999px;
        }
        .home-targets button,
        .home-portal-card button,
        .home-avatar-regions button {
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          background: rgba(255,255,255,.1);
          color: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .16em;
          padding: 10px 14px;
          text-transform: uppercase;
          transition: border-color .18s ease, background .18s ease, transform .18s ease;
        }
        .home-targets button:hover,
        .home-portal-card button:hover,
        .home-avatar-regions button:hover {
          border-color: rgba(125,239,255,.58);
          background: rgba(125,239,255,.14);
          transform: translateY(-1px);
        }
        .home-targets button:focus-visible,
        .home-portal-card button:focus-visible,
        .home-avatar-regions button:focus-visible,
        .home-passive-orb button:focus-visible {
          outline: 2px solid #7defff;
          outline-offset: 3px;
        }
        .home-portal-card {
          right: 24px;
          bottom: 24px;
          width: min(460px, calc(100vw - 48px));
          border-radius: 28px;
          padding: 20px;
        }
        .home-portal-card__eyebrow {
          color: rgba(126,239,255,.85);
          font-size: 12px;
          letter-spacing: .2em;
          text-transform: uppercase;
        }
        .home-portal-card h2 {
          margin: 8px 0;
          font-size: clamp(24px, 3vw, 38px);
          line-height: 1.05;
        }
        .home-portal-card p {
          color: rgba(255,255,255,.76);
          line-height: 1.55;
          margin: 0;
        }
        .home-portal-card__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }
        .home-avatar-regions {
          left: 24px;
          top: 96px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          width: min(360px, calc(100vw - 48px));
          border-radius: 28px;
          padding: 14px;
        }
        @media (max-width: 760px) {
          .home-targets {
            left: 12px;
            right: 12px;
            top: max(12px, env(safe-area-inset-top));
            transform: none;
            justify-content: center;
            flex-wrap: wrap;
            border-radius: 24px;
          }
          .home-passive-orb {
            right: 12px;
            top: 96px;
          }
          .home-avatar-regions {
            left: 12px;
            right: 12px;
            top: 172px;
            width: auto;
          }
          .home-portal-card {
            left: 12px;
            right: 12px;
            bottom: 12px;
            width: auto;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .home-targets button,
          .home-portal-card button,
          .home-avatar-regions button {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}

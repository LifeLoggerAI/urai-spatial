"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type HomePortal = "none" | "orb" | "avatar" | "sky" | "ground";
type AvatarRegion = "head" | "heart" | "arms" | "legs";
type GroundAnchor = "room" | "object" | "routine" | "place";

type PortalCopy = {
  eyebrow: string;
  title: string;
  body: string;
  cta?: string;
};

const SKY_PORTAL_KEY = "urai:transition:sky-to-life-map";

const portalCopy: Record<Exclude<HomePortal, "none">, PortalCopy> = {
  orb: {
    eyebrow: "Orb Companion",
    title: "Passive companion is awake.",
    body:
      "The orb stays present as a spatial navigator. It can route you toward the Life Map, body portal, ground world, or return you to the home view without exposing private data.",
    cta: "Open Life Map",
  },
  avatar: {
    eyebrow: "Avatar Portal",
    title: "Body map is ready.",
    body:
      "The avatar portal is the entry point for head, heart, arms, and legs layers. These are framed as privacy-safe wellness and behavior signals, never as diagnosis.",
    cta: "Select Body Signal",
  },
  sky: {
    eyebrow: "Sky / Life Map",
    title: "Sky ascent is ready.",
    body:
      "The sky is the quiet transition surface. Tapping it opens the Life Map as a constellation of memory, mood, rhythm, and symbolic pattern.",
    cta: "Open Life Map",
  },
  ground: {
    eyebrow: "Ground World",
    title: "Place, objects, and anchors are available.",
    body:
      "The ground layer is the world-context portal for room anchors, object memories, routine paths, and future AR/WebXR seams.",
    cta: "Inspect Anchors",
  },
};

const avatarRegionCopy: Record<AvatarRegion, { title: string; body: string; signal: string }> = {
  head: {
    title: "Head Layer",
    body: "Focus, reflection, cognitive load, and thought-pattern weather enter here as supportive context.",
    signal: "Focus weather · passive",
  },
  heart: {
    title: "Heart Layer",
    body:
      "Mood, social warmth, emotional recovery, breath, rhythm, and companion resonance become the feeling layer of URAI.",
    signal: "Emotional signal · passive",
  },
  arms: {
    title: "Arms Layer",
    body:
      "Typing strain, device friction, task movement, and action momentum can be shown as non-clinical behavior signals.",
    signal: "Action trace · passive",
  },
  legs: {
    title: "Legs Layer",
    body: "Movement, grounding, place shift, and mobility rhythm become the physical-path layer of URAI Spatial.",
    signal: "Grounding path · passive",
  },
};

const groundAnchorCopy: Record<GroundAnchor, { title: string; body: string }> = {
  room: {
    title: "Room Anchor",
    body: "A home/work context anchor that can later connect routines, emotional weather, and object memory.",
  },
  object: {
    title: "Object Memory",
    body: "A future seam for meaningful objects, reminders, tools, keepsakes, and recurring environmental cues.",
  },
  routine: {
    title: "Routine Path",
    body: "A spatial lane for daily rhythm, exits, returns, friction points, and recovery loops.",
  },
  place: {
    title: "Place Context",
    body: "A privacy-safe place layer that can summarize location meaning without exposing raw tracking details.",
  },
};

const keyboardHint =
  "Press O for Orb, A for Avatar, S for Sky and Life Map ascent, G for Ground, or Escape to close the active portal.";

function label(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

export function HomeCohesionLayer({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [portal, setPortal] = useState<HomePortal>("orb");
  const [avatarRegion, setAvatarRegion] = useState<AvatarRegion>("head");
  const [groundAnchor, setGroundAnchor] = useState<GroundAnchor>("room");
  const [transitioning, setTransitioning] = useState(false);

  const closePortal = useCallback(() => setPortal("none"), []);

  const markSkyTransition = useCallback(() => {
    if (typeof window !== "undefined") window.sessionStorage.setItem(SKY_PORTAL_KEY, "1");
    setPortal("sky");
    setTransitioning(true);
  }, []);

  const openSky = useCallback(() => {
    markSkyTransition();
    router.push("/ascent", { scroll: false });
  }, [markSkyTransition, router]);

  const openLifeMap = useCallback(() => {
    markSkyTransition();
    router.push("/life-map?transition=sky", { scroll: false });
  }, [markSkyTransition, router]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (event.key === "Escape") closePortal();
      if (key === "o") setPortal("orb");
      if (key === "a") setPortal("avatar");
      if (key === "g") setPortal("ground");
      if (key === "s") openSky();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePortal, enabled, openSky]);

  const activeCopy = portal === "none" ? null : portalCopy[portal];
  const activeAvatar = avatarRegionCopy[avatarRegion];
  const activeGround = groundAnchorCopy[groundAnchor];

  const cardTitle = useMemo(() => {
    if (portal === "avatar") return activeAvatar.title;
    if (portal === "ground") return activeGround.title;
    return activeCopy?.title ?? "";
  }, [activeAvatar.title, activeCopy?.title, activeGround.title, portal]);

  const cardBody = useMemo(() => {
    if (portal === "avatar") return activeAvatar.body;
    if (portal === "ground") return activeGround.body;
    return activeCopy?.body ?? "";
  }, [activeAvatar.body, activeCopy?.body, activeGround.body, portal]);

  if (!enabled) return null;

  return (
    <div className="home-cohesion-layer" data-urai-home-cohesion="true" data-active-portal={portal} data-transitioning={transitioning ? "true" : "false"}>
      <p className="home-keyboard-hint" aria-hidden="true">{keyboardHint}</p>

      <button type="button" className="home-sky-hit-zone" onClick={openSky} aria-label="Begin sky ascent to Life Map" />

      <div className="home-cinematic-field" aria-hidden="true">
        <span className="field-star star-a" />
        <span className="field-star star-b" />
        <span className="field-star star-c" />
        <span className="field-star star-d" />
        <span className="field-star star-e" />
        <span className="horizon-line" />
        <span className="ground-curve" />
        <span className="aura-column" />
        <span className="center-orb" />
        <span className="avatar-presence avatar-head" />
        <span className="avatar-presence avatar-core" />
        <span className="avatar-presence avatar-arm-left" />
        <span className="avatar-presence avatar-arm-right" />
        <span className="avatar-presence avatar-leg-left" />
        <span className="avatar-presence avatar-leg-right" />
      </div>

      <button type="button" className="home-passive-orb" data-urai-home-orb="passive" onClick={() => setPortal("orb")} aria-label="Open orb companion layer">
        <span className="home-passive-orb__glow" aria-hidden="true" />
        <span className="home-passive-orb__copy">
          <strong>Orb awake</strong>
          <em>Passive navigator</em>
        </span>
      </button>

      <nav className="home-targets" aria-label="URAI Spatial home targets">
        {(["orb", "avatar", "sky", "ground"] as Exclude<HomePortal, "none">[]).map((target) => (
          <button
            key={target}
            type="button"
            data-urai-home-target={target}
            aria-pressed={portal === target}
            onClick={() => setPortal(target)}
          >
            {target}
          </button>
        ))}
      </nav>

      {portal !== "none" ? <div className="home-portal-vignette" aria-hidden="true" /> : null}

      {portal === "avatar" ? (
        <section className="home-avatar-regions" data-urai-avatar-portal="home" aria-label="Avatar body regions">
          {(Object.keys(avatarRegionCopy) as AvatarRegion[]).map((region) => (
            <button
              key={region}
              type="button"
              data-urai-avatar-region={region}
              aria-pressed={avatarRegion === region}
              onClick={() => setAvatarRegion(region)}
            >
              {label(region)}
            </button>
          ))}
        </section>
      ) : null}

      {portal === "ground" ? (
        <section className="home-ground-anchors" data-urai-ground-portal="home" aria-label="Ground world anchors">
          {(Object.keys(groundAnchorCopy) as GroundAnchor[]).map((anchor) => (
            <button
              key={anchor}
              type="button"
              data-urai-ground-anchor={anchor}
              aria-pressed={groundAnchor === anchor}
              onClick={() => setGroundAnchor(anchor)}
            >
              {label(anchor)}
            </button>
          ))}
        </section>
      ) : null}

      {activeCopy ? (
        <aside className="home-portal-card" data-urai-home-portal={portal} aria-live="polite">
          <div className="home-portal-card__eyebrow">{activeCopy.eyebrow}</div>
          <h2>{cardTitle}</h2>
          <p>{cardBody}</p>
          {portal === "avatar" ? <small>{activeAvatar.signal}</small> : null}
          {portal === "sky" ? <small>{transitioning ? "Opening constellation..." : "Tap sky · open Life Map"}</small> : null}
          <div className="home-portal-card__actions">
            {portal === "orb" ? <button type="button" onClick={openLifeMap}>{activeCopy.cta}</button> : null}
            {portal === "orb" ? <button type="button" onClick={() => setPortal("avatar")}>Open Avatar</button> : null}
            {portal === "orb" ? <button type="button" onClick={() => setPortal("ground")}>Open Ground</button> : null}
            {portal === "sky" ? <button type="button" onClick={openLifeMap}>{activeCopy.cta}</button> : null}
            {portal === "avatar" ? <button type="button" onClick={() => setPortal("sky")}>Send Signal to Sky</button> : null}
            {portal === "ground" ? <button type="button" onClick={openLifeMap}>Map This Context</button> : null}
            <button type="button" onClick={closePortal}>Close</button>
          </div>
        </aside>
      ) : null}

      <section className="sr-only" aria-label="Home spatial keyboard shortcuts">
        {keyboardHint}
      </section>

      <style jsx>{`
        .home-cohesion-layer {
          position: fixed;
          inset: 0;
          z-index: 32;
          pointer-events: none;
          color: white;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          isolation: isolate;
        }

        .home-keyboard-hint {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          z-index: 42;
          margin: 0;
          padding: 6px 12px;
          color: rgba(236, 248, 255, 0.84);
          font-size: clamp(12px, 1.25vw, 16px);
          font-weight: 700;
          letter-spacing: -0.01em;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.34);
          pointer-events: none;
        }

        .home-sky-hit-zone {
          position: absolute;
          inset: 0;
          z-index: 1;
          border: 0;
          background: transparent;
          cursor: zoom-in;
          pointer-events: auto;
        }

        .home-cinematic-field {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 38%, rgba(181, 219, 255, 0.22), transparent 24%),
            radial-gradient(circle at 72% 16%, rgba(93, 119, 214, 0.2), transparent 28%),
            radial-gradient(circle at 22% 18%, rgba(91, 194, 255, 0.12), transparent 24%),
            linear-gradient(180deg, rgba(48, 93, 169, 0.44), rgba(4, 11, 28, 0.18) 70%);
          mix-blend-mode: screen;
        }

        .horizon-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 66%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(125, 239, 255, 0.35), rgba(255, 255, 255, 0.18), transparent);
          box-shadow: 0 0 24px rgba(125, 239, 255, 0.18);
        }

        .ground-curve {
          position: absolute;
          left: -8%;
          right: -8%;
          bottom: -24%;
          height: 48%;
          border-radius: 50% 50% 0 0;
          background:
            radial-gradient(circle at 50% 0%, rgba(82, 151, 196, 0.2), transparent 45%),
            linear-gradient(180deg, rgba(12, 33, 56, 0.65), rgba(2, 7, 18, 0.18) 70%);
          border-top: 1px solid rgba(125, 211, 252, 0.08);
        }

        .field-star {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 0 16px rgba(255, 255, 255, 0.75), 0 0 36px rgba(125, 239, 255, 0.3);
          animation: homeStarDrift 9s ease-in-out infinite alternate;
        }

        .star-a { left: 18%; top: 25%; animation-delay: -1s; }
        .star-b { left: 36%; top: 15%; width: 2px; height: 2px; animation-delay: -2s; }
        .star-c { left: 68%; top: 23%; width: 2px; height: 2px; animation-delay: -3s; }
        .star-d { left: 73%; top: 35%; width: 2px; height: 2px; animation-delay: -4s; }
        .star-e { left: 82%; top: 54%; width: 1px; height: 1px; animation-delay: -5s; }

        .aura-column {
          position: absolute;
          left: 50%;
          top: 18%;
          width: min(42vw, 560px);
          height: 58vh;
          transform: translateX(-50%);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 36%, rgba(202, 245, 255, 0.16), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 75%);
          filter: blur(2px);
          opacity: 0.58;
          animation: auraBreath 7s ease-in-out infinite;
        }

        .center-orb {
          position: absolute;
          left: 50%;
          top: 48%;
          width: 80px;
          height: 80px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background:
            radial-gradient(circle at 48% 45%, #effcff 0%, #b8fbff 32%, rgba(75, 218, 255, 0.46) 58%, rgba(15, 23, 42, 0) 78%),
            rgba(103, 232, 249, 0.35);
          box-shadow: 0 0 18px rgba(103, 232, 249, 0.75), 0 0 42px rgba(103, 232, 249, 0.28);
          opacity: 0.5;
          animation: orbFloat 4.5s ease-in-out infinite;
        }

        .avatar-presence {
          position: absolute;
          left: 50%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(125, 211, 252, 0.02));
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 40px rgba(125, 211, 252, 0.1);
          opacity: 0.36;
        }

        .avatar-head { top: 36%; width: 78px; height: 78px; transform: translateX(-50%); border-radius: 999px; }
        .avatar-core { top: calc(36% + 88px); width: 96px; height: 136px; transform: translateX(-50%); border-radius: 999px 999px 44px 44px; }
        .avatar-arm-left { top: calc(36% + 112px); width: 18px; height: 124px; transform: translateX(-86px) rotate(12deg); border-radius: 999px; }
        .avatar-arm-right { top: calc(36% + 112px); width: 18px; height: 124px; transform: translateX(68px) rotate(-12deg); border-radius: 999px; }
        .avatar-leg-left { top: calc(36% + 212px); width: 18px; height: 118px; transform: translateX(-30px) rotate(5deg); border-radius: 999px; }
        .avatar-leg-right { top: calc(36% + 212px); width: 18px; height: 118px; transform: translateX(12px) rotate(-5deg); border-radius: 999px; }

        .home-portal-vignette {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 24%, rgba(125, 239, 255, 0.08), transparent 28%),
            radial-gradient(circle at 50% 70%, rgba(167, 139, 250, 0.08), transparent 32%);
        }

        .home-passive-orb,
        .home-targets,
        .home-portal-card,
        .home-avatar-regions,
        .home-ground-anchors {
          pointer-events: auto;
          position: absolute;
          z-index: 44;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(3, 8, 20, 0.66);
          backdrop-filter: blur(18px);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
        }

        .home-passive-orb {
          right: 24px;
          top: 64px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 24px;
          padding: 12px 14px;
          color: white;
          cursor: pointer;
        }

        .home-passive-orb__glow {
          width: 54px;
          height: 54px;
          border: 1px solid rgba(125, 239, 255, 0.42);
          border-radius: 999px;
          background: radial-gradient(circle, #fff, #7defff 42%, rgba(65, 190, 255, 0.2) 72%);
          box-shadow: 0 0 52px rgba(125, 239, 255, 0.72);
        }

        .home-passive-orb__copy strong,
        .home-passive-orb__copy em {
          display: block;
          text-align: left;
        }

        .home-passive-orb__copy strong {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(221, 250, 255, 0.96);
        }

        .home-passive-orb__copy em {
          margin-top: 3px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
          font-style: normal;
        }

        .home-targets {
          left: 50%;
          top: 40px;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          padding: 10px;
          border-radius: 999px;
          z-index: 46;
        }

        .home-targets button,
        .home-portal-card button,
        .home-avatar-regions button,
        .home-ground-anchors button {
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.16em;
          padding: 10px 14px;
          text-transform: uppercase;
          transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
        }

        .home-targets button:hover,
        .home-portal-card button:hover,
        .home-avatar-regions button:hover,
        .home-ground-anchors button:hover,
        .home-targets button[aria-pressed="true"],
        .home-avatar-regions button[aria-pressed="true"],
        .home-ground-anchors button[aria-pressed="true"] {
          border-color: rgba(125, 239, 255, 0.72);
          background: rgba(125, 239, 255, 0.14);
          box-shadow: inset 0 0 0 1px rgba(125, 239, 255, 0.18), 0 0 24px rgba(103, 232, 249, 0.14);
          transform: translateY(-1px);
        }

        .home-targets button:focus-visible,
        .home-portal-card button:focus-visible,
        .home-avatar-regions button:focus-visible,
        .home-ground-anchors button:focus-visible,
        .home-passive-orb:focus-visible,
        .home-sky-hit-zone:focus-visible {
          outline: 2px solid #7defff;
          outline-offset: 3px;
        }

        .home-portal-card {
          right: 24px;
          bottom: 24px;
          width: min(460px, calc(100vw - 48px));
          border-radius: 28px;
          padding: 20px;
          background: linear-gradient(180deg, rgba(8, 19, 43, 0.94), rgba(3, 9, 21, 0.94));
        }

        .home-portal-card__eyebrow {
          color: rgba(126, 239, 255, 0.88);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .home-portal-card h2 {
          margin: 8px 0;
          font-size: clamp(30px, 4vw, 42px);
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .home-portal-card p {
          color: rgba(255, 255, 255, 0.76);
          font-size: 16px;
          font-weight: 650;
          line-height: 1.5;
          margin: 0;
        }

        .home-portal-card small {
          display: inline-block;
          margin-top: 12px;
          color: rgba(125, 239, 255, 0.84);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .home-portal-card__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .home-avatar-regions,
        .home-ground-anchors {
          left: 24px;
          top: 184px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          width: min(390px, calc(100vw - 48px));
          border-radius: 28px;
          padding: 14px;
        }

        .home-ground-anchors {
          top: 260px;
        }

        [data-active-portal="avatar"] .home-avatar-regions,
        [data-active-portal="ground"] .home-ground-anchors {
          animation: portalPanelIn 220ms ease both;
        }

        [data-transitioning="true"] .home-cinematic-field {
          animation: skyOpen 900ms ease both;
        }

        @keyframes homeStarDrift {
          from { transform: translate3d(-4px, -3px, 0); opacity: 0.5; }
          to { transform: translate3d(5px, 3px, 0); opacity: 0.95; }
        }

        @keyframes auraBreath {
          0%, 100% { transform: translateX(-50%) scale(0.96); opacity: 0.42; }
          50% { transform: translateX(-50%) scale(1.06); opacity: 0.62; }
        }

        @keyframes orbFloat {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, calc(-50% - 8px)) scale(1.04); }
        }

        @keyframes portalPanelIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes skyOpen {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0.78; transform: scale(1.12); }
        }

        @media (max-width: 760px) {
          .home-keyboard-hint {
            font-size: 11px;
            padding: 5px 8px;
          }

          .home-targets {
            left: 12px;
            right: 12px;
            top: max(30px, env(safe-area-inset-top));
            transform: none;
            justify-content: center;
            flex-wrap: wrap;
            border-radius: 24px;
          }

          .home-targets button,
          .home-portal-card button,
          .home-avatar-regions button,
          .home-ground-anchors button {
            font-size: 10px;
            padding: 9px 11px;
          }

          .home-passive-orb {
            right: 12px;
            top: 110px;
            padding: 10px;
          }

          .home-passive-orb__copy {
            display: none;
          }

          .home-passive-orb__glow {
            width: 46px;
            height: 46px;
          }

          .home-avatar-regions,
          .home-ground-anchors {
            left: 12px;
            right: 12px;
            top: 174px;
            width: auto;
          }

          .home-ground-anchors {
            top: 238px;
          }

          .home-portal-card {
            left: 12px;
            right: 12px;
            bottom: 12px;
            width: auto;
            padding: 18px;
          }

          .home-portal-card h2 {
            font-size: 28px;
          }

          .home-portal-card p {
            font-size: 14px;
          }

          .avatar-presence,
          .center-orb {
            opacity: 0.25;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-targets button,
          .home-portal-card button,
          .home-avatar-regions button,
          .home-ground-anchors button,
          .field-star,
          .aura-column,
          .center-orb,
          [data-transitioning="true"] .home-cinematic-field {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

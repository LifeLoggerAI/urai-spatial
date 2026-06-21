"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type HomePortal = "none" | "orb" | "avatar" | "sky" | "ground";
type AvatarRegion = "head" | "heart" | "arms" | "legs";
type GroundAnchor = "room" | "object" | "routine" | "place";

const SKY_PORTAL_KEY = "urai:transition:sky-to-life-map";

const avatarRegionCopy: Record<AvatarRegion, string> = {
  head: "Focus and reflection layer",
  heart: "Mood and emotional resonance layer",
  arms: "Action and device-friction layer",
  legs: "Movement and grounding layer",
};

const groundAnchorCopy: Record<GroundAnchor, string> = {
  room: "Room anchor",
  object: "Object memory anchor",
  routine: "Routine path anchor",
  place: "Place context anchor",
};

function label(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

export function HomeCohesionLayer({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [portal, setPortal] = useState<HomePortal>("orb");
  const [avatarRegion, setAvatarRegion] = useState<AvatarRegion>("heart");
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

  const status = useMemo(() => {
    if (portal === "sky") return transitioning ? "Sky portal opening into Life Map" : "Sky portal ready";
    if (portal === "avatar") return avatarRegionCopy[avatarRegion];
    if (portal === "ground") return groundAnchorCopy[groundAnchor];
    if (portal === "orb") return "Orb companion present";
    return "URAI home field settled";
  }, [avatarRegion, groundAnchor, portal, transitioning]);

  if (!enabled) return null;

  return (
    <div
      className="home-cohesion-layer"
      data-testid="urai-home-scene"
      data-urai-home-cohesion="true"
      data-active-portal={portal}
      data-avatar-region={avatarRegion}
      data-ground-anchor={groundAnchor}
      data-transitioning={transitioning ? "true" : "false"}
    >
      <button
        type="button"
        className="home-sky-hit-zone"
        data-testid="urai-home-sky-portal"
        data-urai-home-target="sky"
        onClick={openSky}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openSky();
          }
        }}
        aria-label="Open Life Map through the sky"
      />

      <div className="home-cinematic-field" aria-hidden="true">
        <span className="field-star star-a" />
        <span className="field-star star-b" />
        <span className="field-star star-c" />
        <span className="field-star star-d" />
        <span className="field-star star-e" />
        <span className="field-star star-f" />
        <span className="horizon-line" />
        <span className="ground-line" data-testid="urai-ground-plane" />
        <span className="ground-curve" />
        <span className="ground-aura" />
        <span className="aura-column" />
        <span className="avatar-presence avatar-head" data-testid="urai-avatar-body" />
        <span className="avatar-presence avatar-core" />
        <span className="avatar-presence avatar-arm-left" />
        <span className="avatar-presence avatar-arm-right" />
        <span className="avatar-presence avatar-leg-left" />
        <span className="avatar-presence avatar-leg-right" />
        <span className="center-orb" data-testid="urai-orb-companion" />
        <span className="orb-upward-reflection" />
        <span className="sky-portal-bloom" />
      </div>

      <button type="button" className="home-orb-presence" data-urai-home-target="orb" onClick={() => setPortal("orb")} aria-label="Orb companion presence" />

      <button type="button" className="home-avatar-region home-avatar-region--head" data-urai-avatar-region="head" aria-label="Head layer" onClick={() => { setPortal("avatar"); setAvatarRegion("head"); }} />
      <button type="button" className="home-avatar-region home-avatar-region--heart" data-urai-avatar-region="heart" aria-label="Heart layer" onClick={() => { setPortal("avatar"); setAvatarRegion("heart"); }} />
      <button type="button" className="home-avatar-region home-avatar-region--arms" data-urai-avatar-region="arms" aria-label="Arms layer" onClick={() => { setPortal("avatar"); setAvatarRegion("arms"); }} />
      <button type="button" className="home-avatar-region home-avatar-region--legs" data-urai-avatar-region="legs" aria-label="Legs layer" onClick={() => { setPortal("avatar"); setAvatarRegion("legs"); }} />

      {(Object.keys(groundAnchorCopy) as GroundAnchor[]).map((anchor) => (
        <button
          key={anchor}
          type="button"
          className={`home-ground-anchor home-ground-anchor--${anchor}`}
          data-urai-ground-anchor={anchor}
          aria-label={`${label(anchor)} ground anchor`}
          onClick={() => {
            setPortal("ground");
            setGroundAnchor(anchor);
          }}
        />
      ))}

      <button type="button" className="home-life-map-affordance" onClick={openLifeMap} aria-label="Open Life Map">
        <span aria-hidden="true">Life Map</span>
      </button>

      <section className="sr-only" aria-label="URAI Spatial home controls" aria-live="polite">
        <p>{status}</p>
        <p>Keyboard shortcuts: O focuses the orb, A focuses the avatar, S opens the sky ascent, G focuses the ground, and Escape settles the portal state.</p>
      </section>

      <style jsx>{`
        .home-cohesion-layer {
          position: fixed;
          inset: 0;
          z-index: 24;
          pointer-events: none;
          color: white;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          isolation: isolate;
        }

        .home-sky-hit-zone,
        .home-orb-presence,
        .home-avatar-region,
        .home-ground-anchor,
        .home-life-map-affordance {
          position: absolute;
          z-index: 44;
          border: 0;
          background: transparent;
          pointer-events: auto;
        }

        .home-sky-hit-zone {
          inset: 0 0 38% 0;
          cursor: zoom-in;
        }

        .home-cinematic-field {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 33%, rgba(191, 224, 255, 0.25), transparent 23%),
            radial-gradient(circle at 50% 45%, rgba(103, 232, 249, 0.11), transparent 29%),
            radial-gradient(circle at 72% 18%, rgba(139, 92, 246, 0.18), transparent 30%),
            radial-gradient(circle at 18% 24%, rgba(125, 211, 252, 0.12), transparent 26%),
            linear-gradient(180deg, rgba(48, 93, 169, 0.42), rgba(7, 17, 42, 0.5) 56%, rgba(2, 7, 18, 0.28) 100%);
          mix-blend-mode: screen;
        }

        .field-star {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 0 16px rgba(255, 255, 255, 0.72), 0 0 36px rgba(125, 239, 255, 0.28);
          animation: homeStarDrift 11s ease-in-out infinite alternate;
        }

        .star-a { left: 18%; top: 25%; animation-delay: -1s; }
        .star-b { left: 36%; top: 15%; width: 1px; height: 1px; animation-delay: -2s; }
        .star-c { left: 68%; top: 23%; width: 1px; height: 1px; animation-delay: -3s; }
        .star-d { left: 73%; top: 35%; width: 2px; height: 2px; animation-delay: -4s; }
        .star-e { left: 82%; top: 54%; width: 1px; height: 1px; animation-delay: -5s; }
        .star-f { left: 27%; top: 45%; width: 1px; height: 1px; animation-delay: -6s; }

        .horizon-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 66%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(125, 239, 255, 0.27), rgba(255, 255, 255, 0.14), transparent);
          box-shadow: 0 0 24px rgba(125, 239, 255, 0.14);
        }

        .ground-line {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 34%;
          opacity: 0;
        }

        .ground-curve {
          position: absolute;
          left: -8%;
          right: -8%;
          bottom: -24%;
          height: 48%;
          border-radius: 50% 50% 0 0;
          background:
            radial-gradient(circle at 50% 0%, rgba(82, 151, 196, 0.22), transparent 42%),
            radial-gradient(circle at 54% 16%, rgba(182, 160, 96, 0.08), transparent 28%),
            linear-gradient(180deg, rgba(12, 33, 56, 0.65), rgba(2, 7, 18, 0.18) 70%);
          border-top: 1px solid rgba(125, 211, 252, 0.08);
        }

        .ground-aura {
          position: absolute;
          left: 28%;
          right: 28%;
          bottom: 12%;
          height: 9%;
          border-radius: 999px;
          background: radial-gradient(ellipse, rgba(191, 169, 84, 0.16), rgba(45, 212, 191, 0.06), transparent 72%);
          filter: blur(22px);
        }

        .aura-column {
          position: absolute;
          left: 50%;
          top: 17%;
          width: min(42vw, 560px);
          height: 59vh;
          transform: translateX(-50%);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 36%, rgba(202, 245, 255, 0.16), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 75%);
          filter: blur(2px);
          opacity: 0.56;
          animation: auraBreath 8s ease-in-out infinite;
        }

        .center-orb {
          position: absolute;
          left: 50%;
          top: 48%;
          width: 82px;
          height: 82px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background:
            radial-gradient(circle at 48% 45%, #effcff 0%, #b8fbff 32%, rgba(75, 218, 255, 0.46) 58%, rgba(15, 23, 42, 0) 78%),
            rgba(103, 232, 249, 0.34);
          box-shadow: 0 0 18px rgba(103, 232, 249, 0.75), 0 0 62px rgba(103, 232, 249, 0.22), 0 -54px 120px rgba(125, 211, 252, 0.1);
          opacity: 0.52;
          animation: orbFloat 5s ease-in-out infinite;
        }

        .orb-upward-reflection {
          position: absolute;
          left: 50%;
          top: 31%;
          width: 22vw;
          max-width: 310px;
          height: 28vh;
          transform: translateX(-50%);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(125, 239, 255, 0.18), rgba(139, 92, 246, 0.06), transparent);
          filter: blur(20px);
          opacity: 0.32;
        }

        .sky-portal-bloom {
          position: absolute;
          left: 50%;
          top: 18%;
          width: min(34vw, 420px);
          height: min(34vw, 420px);
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(226, 246, 255, 0.13), rgba(125, 211, 252, 0.06), transparent 66%);
          opacity: 0.52;
        }

        .avatar-presence {
          position: absolute;
          left: 50%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(125, 211, 252, 0.02));
          border: 1px solid rgba(255, 255, 255, 0.055);
          box-shadow: 0 0 40px rgba(125, 211, 252, 0.09);
          opacity: 0.34;
        }

        .avatar-head { top: 36%; width: 78px; height: 78px; transform: translateX(-50%); border-radius: 999px; }
        .avatar-core { top: calc(36% + 88px); width: 96px; height: 136px; transform: translateX(-50%); border-radius: 999px 999px 44px 44px; }
        .avatar-arm-left { top: calc(36% + 112px); width: 18px; height: 124px; transform: translateX(-86px) rotate(12deg); border-radius: 999px; }
        .avatar-arm-right { top: calc(36% + 112px); width: 18px; height: 124px; transform: translateX(68px) rotate(-12deg); border-radius: 999px; }
        .avatar-leg-left { top: calc(36% + 212px); width: 18px; height: 118px; transform: translateX(-30px) rotate(5deg); border-radius: 999px; }
        .avatar-leg-right { top: calc(36% + 212px); width: 18px; height: 118px; transform: translateX(12px) rotate(-5deg); border-radius: 999px; }

        .home-orb-presence {
          left: calc(50% - 54px);
          top: calc(48% - 54px);
          width: 108px;
          height: 108px;
          border-radius: 999px;
          cursor: pointer;
        }

        .home-avatar-region {
          left: 50%;
          transform: translateX(-50%);
          border-radius: 999px;
        }

        .home-avatar-region--head { top: 35%; width: 98px; height: 98px; }
        .home-avatar-region--heart { top: 48%; width: 132px; height: 138px; }
        .home-avatar-region--arms { top: 50%; width: 236px; height: 150px; }
        .home-avatar-region--legs { top: 66%; width: 132px; height: 176px; }

        .home-ground-anchor {
          bottom: 0;
          height: 31%;
          cursor: pointer;
        }

        .home-ground-anchor--room { left: 0; width: 25%; }
        .home-ground-anchor--object { left: 25%; width: 25%; }
        .home-ground-anchor--routine { left: 50%; width: 25%; }
        .home-ground-anchor--place { left: 75%; width: 25%; }

        .home-life-map-affordance {
          left: 50%;
          bottom: max(22px, env(safe-area-inset-bottom));
          transform: translateX(-50%);
          min-height: 44px;
          padding: 0 18px;
          border: 1px solid rgba(182, 226, 255, 0.22);
          border-radius: 999px;
          background: rgba(3, 8, 20, 0.2);
          color: rgba(235, 250, 255, 0.68);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          backdrop-filter: blur(18px);
          opacity: 0.62;
          transition: opacity 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }

        .home-life-map-affordance:hover,
        .home-life-map-affordance:focus-visible {
          opacity: 1;
          border-color: rgba(125, 239, 255, 0.54);
          transform: translateX(-50%) translateY(-1px);
        }

        .home-sky-hit-zone:focus-visible,
        .home-orb-presence:focus-visible,
        .home-avatar-region:focus-visible,
        .home-ground-anchor:focus-visible {
          outline: 2px solid rgba(125, 239, 255, 0.72);
          outline-offset: -8px;
        }

        [data-transitioning="true"] .home-cinematic-field {
          animation: skyOpen 900ms ease both;
        }

        [data-active-portal="sky"] .sky-portal-bloom,
        [data-active-portal="sky"] .orb-upward-reflection {
          opacity: 0.86;
        }

        [data-active-portal="ground"] .ground-aura {
          opacity: 0.9;
        }

        [data-active-portal="avatar"] .avatar-presence {
          opacity: 0.47;
        }

        @keyframes homeStarDrift {
          from { transform: translate3d(-4px, -3px, 0); opacity: 0.48; }
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

        @keyframes skyOpen {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0.78; transform: scale(1.12); }
        }

        @media (max-width: 760px) {
          .center-orb { width: 64px; height: 64px; }
          .avatar-head { width: 62px; height: 62px; }
          .avatar-core { width: 76px; height: 112px; }
          .avatar-arm-left { transform: translateX(-68px) rotate(12deg); }
          .avatar-arm-right { transform: translateX(52px) rotate(-12deg); }
          .home-life-map-affordance { bottom: max(14px, env(safe-area-inset-bottom)); opacity: 0.5; }
        }

        @media (prefers-reduced-motion: reduce) {
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

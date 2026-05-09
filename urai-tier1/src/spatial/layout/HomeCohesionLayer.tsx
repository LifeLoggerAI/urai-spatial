"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type HomePortal = "none" | "orb" | "avatar" | "ground";

type WhisperCopy = {
  eyebrow: string;
  title: string;
  body: string;
};

const SKY_PORTAL_KEY = "urai:transition:sky-to-life-map";

const whispers: Record<Exclude<HomePortal, "none">, WhisperCopy> = {
  orb: {
    eyebrow: "Current Signal",
    title: "URAI is quietly awake.",
    body: "Your field is being held as atmosphere first, not a dashboard. The orb is the soft center of today’s signal.",
  },
  avatar: {
    eyebrow: "Body Field",
    title: "The silhouette is identity-safe.",
    body: "It reflects rhythm, pressure, recovery, and presence without turning your body into a medical chart.",
  },
  ground: {
    eyebrow: "Grounding Layer",
    title: "The lower field carries stability.",
    body: "Mist, root light, and shadow keep the scene embodied while the sky holds the larger Life Map.",
  },
};

export function HomeCohesionLayer({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [portal, setPortal] = useState<HomePortal>("none");
  const [transitioning, setTransitioning] = useState(false);

  const closePortal = useCallback(() => setPortal("none"), []);

  const markSkyTransition = useCallback(() => {
    if (typeof window !== "undefined") window.sessionStorage.setItem(SKY_PORTAL_KEY, "1");
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
      if (key === "s") openSky();
      if (key === "o") setPortal("orb");
      if (key === "a") setPortal("avatar");
      if (key === "g") setPortal("ground");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePortal, enabled, openSky]);

  if (!enabled) return null;

  const activeWhisper = portal === "none" ? null : whispers[portal];

  return (
    <div
      className="home-cohesion-layer"
      data-urai-home-cohesion="true"
      data-active-portal={portal}
      data-transitioning={transitioning ? "true" : "false"}
      aria-label="URAI home scene showing current emotional atmosphere."
    >
      <div className="home-sky-atmosphere" aria-hidden="true">
        <span className="sky-glow glow-a" />
        <span className="sky-glow glow-b" />
        <span className="aurora aurora-a" />
        <span className="aurora aurora-b" />
        <span className="star star-a" />
        <span className="star star-b" />
        <span className="star star-c" />
        <span className="star star-d" />
        <span className="star star-e" />
        <span className="star star-f" />
      </div>

      <div className="home-avatar-field" aria-hidden="true">
        <span className="avatar-aura aura-back" />
        <span className="sky-thread thread-left" />
        <span className="sky-thread thread-right" />
        <span className="avatar-body body-head" />
        <span className="avatar-body body-neck" />
        <span className="avatar-body body-torso" />
        <span className="avatar-body body-arm body-arm-left" />
        <span className="avatar-body body-arm body-arm-right" />
        <span className="avatar-body body-leg body-leg-left" />
        <span className="avatar-body body-leg body-leg-right" />
        <span className="avatar-aura aura-front" />
      </div>

      <button
        type="button"
        className="hotspot hotspot-orb"
        aria-label="Open current URAI insight"
        onClick={(event) => {
          event.stopPropagation();
          setPortal((value) => (value === "orb" ? "none" : "orb"));
        }}
      >
        <span className="home-orb" aria-hidden="true">
          <span className="orb-halo halo-outer" />
          <span className="orb-halo halo-inner" />
          <span className="orb-core" />
          <span className="orb-shell" />
          <span className="orb-glint glint-a" />
          <span className="orb-glint glint-b" />
          <span className="orb-particle particle-a" />
          <span className="orb-particle particle-b" />
          <span className="orb-particle particle-c" />
        </span>
      </button>

      <button
        type="button"
        className="hotspot hotspot-avatar"
        aria-label="Open body and emotional rhythm insight"
        onClick={(event) => {
          event.stopPropagation();
          setPortal((value) => (value === "avatar" ? "none" : "avatar"));
        }}
      />

      <button
        type="button"
        className="hotspot hotspot-ground"
        aria-label="Open grounding and recovery insight"
        onClick={(event) => {
          event.stopPropagation();
          setPortal((value) => (value === "ground" ? "none" : "ground"));
        }}
      />

      <div className="home-ground-field" aria-hidden="true">
        <span className="ground-horizon" />
        <span className="terrain terrain-back" />
        <span className="terrain terrain-front" />
        <span className="root root-a" />
        <span className="root root-b" />
        <span className="root root-c" />
        <span className="avatar-shadow" />
        <span className="orb-reflection" />
        <span className="mist mist-far" />
        <span className="mist mist-near" />
      </div>

      <button type="button" className="life-map-affordance" aria-label="Open Life Map" onClick={openLifeMap}>
        <span>Open Life Map</span>
      </button>

      {activeWhisper ? (
        <aside className="home-whisper" aria-live="polite" data-urai-home-portal={portal}>
          <button type="button" className="home-whisper-close" aria-label="Close home insight" onClick={closePortal}>
            ×
          </button>
          <div className="home-whisper-eyebrow">{activeWhisper.eyebrow}</div>
          <h2>{activeWhisper.title}</h2>
          <p>{activeWhisper.body}</p>
        </aside>
      ) : null}

      <p className="sr-only">
        URAI home is a quiet symbolic life field. Press S or activate Open Life Map to enter the Life Map. Press O for the current signal, A for body rhythm, or G for grounding.
      </p>

      <style jsx>{`
        .home-cohesion-layer {
          position: fixed;
          inset: 0;
          z-index: 32;
          overflow: hidden;
          pointer-events: none;
          color: #f8fbff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          isolation: isolate;
        }

        .home-cohesion-layer::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -4;
          background:
            radial-gradient(circle at 51% 38%, rgba(189, 227, 255, 0.32), transparent 20%),
            radial-gradient(circle at 50% 64%, rgba(105, 232, 255, 0.12), transparent 24%),
            linear-gradient(180deg, rgba(9, 27, 66, 0.08), rgba(12, 35, 70, 0.2) 45%, rgba(3, 8, 18, 0.64));
        }

        .home-cohesion-layer::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 90;
          pointer-events: none;
          background:
            radial-gradient(ellipse at center, transparent 0%, transparent 52%, rgba(2, 6, 16, 0.18) 78%, rgba(2, 6, 16, 0.42) 100%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 14%, transparent 72%, rgba(0, 0, 0, 0.18));
        }

        .home-sky-atmosphere {
          position: absolute;
          inset: 0;
          z-index: -3;
          pointer-events: none;
        }

        .sky-glow,
        .aurora,
        .star {
          position: absolute;
          display: block;
          pointer-events: none;
        }

        .sky-glow {
          border-radius: 999px;
          filter: blur(4px);
          opacity: 0.72;
        }

        .glow-a {
          left: 28%;
          top: 16%;
          width: min(48vw, 640px);
          height: min(48vw, 640px);
          background: radial-gradient(circle, rgba(185, 221, 255, 0.24), rgba(110, 147, 230, 0.08) 46%, transparent 70%);
          animation: skyBreath 24s ease-in-out infinite;
        }

        .glow-b {
          right: 6%;
          top: 8%;
          width: min(36vw, 520px);
          height: min(36vw, 520px);
          background: radial-gradient(circle, rgba(126, 239, 255, 0.12), rgba(135, 112, 255, 0.08) 42%, transparent 72%);
          animation: skyBreath 31s ease-in-out infinite reverse;
        }

        .aurora {
          width: 68vw;
          height: 22vh;
          border-radius: 999px;
          opacity: 0.26;
          filter: blur(28px);
          transform: rotate(-8deg);
          mix-blend-mode: screen;
        }

        .aurora-a {
          left: -8%;
          top: 18%;
          background: linear-gradient(90deg, transparent, rgba(111, 231, 183, 0.28), rgba(125, 211, 252, 0.18), transparent);
          animation: auroraDrift 48s linear infinite;
        }

        .aurora-b {
          right: -14%;
          top: 36%;
          background: linear-gradient(90deg, transparent, rgba(156, 107, 255, 0.22), rgba(255, 211, 194, 0.14), transparent);
          animation: auroraDrift 58s linear infinite reverse;
        }

        .star {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: rgba(238, 250, 255, 0.95);
          box-shadow: 0 0 14px rgba(221, 247, 255, 0.75), 0 0 34px rgba(125, 211, 252, 0.28);
          animation: starPulse 9s ease-in-out infinite;
        }

        .star-a { left: 18%; top: 30%; animation-delay: -1s; }
        .star-b { left: 34%; top: 21%; width: 2px; height: 2px; animation-delay: -2.5s; }
        .star-c { left: 66%; top: 24%; width: 2px; height: 2px; animation-delay: -4s; }
        .star-d { left: 73%; top: 42%; width: 2px; height: 2px; animation-delay: -5.5s; }
        .star-e { left: 82%; top: 55%; width: 1px; height: 1px; animation-delay: -7s; }
        .star-f { left: 26%; top: 48%; width: 1px; height: 1px; animation-delay: -8s; }

        .home-avatar-field {
          position: absolute;
          left: 50%;
          top: 16%;
          z-index: 8;
          width: clamp(220px, 24vw, 390px);
          height: min(66vh, 680px);
          transform: translateX(-50%);
          pointer-events: none;
          animation: avatarBreath 7.6s ease-in-out infinite;
        }

        .avatar-aura,
        .avatar-body,
        .sky-thread {
          position: absolute;
          left: 50%;
          display: block;
          pointer-events: none;
        }

        .avatar-aura {
          border-radius: 999px;
          transform: translateX(-50%);
          mix-blend-mode: screen;
        }

        .aura-back {
          top: 1%;
          width: 94%;
          height: 78%;
          background:
            radial-gradient(ellipse at 50% 24%, rgba(222, 246, 255, 0.24), transparent 24%),
            radial-gradient(ellipse at 50% 56%, rgba(125, 239, 255, 0.15), transparent 44%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 78%);
          opacity: 0.78;
        }

        .aura-front {
          top: 31%;
          width: 56%;
          height: 42%;
          background: radial-gradient(ellipse at 50% 38%, rgba(234, 255, 255, 0.24), rgba(126, 239, 255, 0.08) 40%, transparent 72%);
          filter: blur(8px);
          opacity: 0.5;
        }

        .sky-thread {
          top: -2%;
          width: 1px;
          height: 35%;
          background: linear-gradient(180deg, transparent, rgba(221, 247, 255, 0.28), transparent);
          opacity: 0.28;
        }

        .thread-left { transform: translateX(-68px) rotate(-10deg); }
        .thread-right { transform: translateX(68px) rotate(10deg); }

        .avatar-body {
          transform: translateX(-50%);
          border: 1px solid rgba(234, 250, 255, 0.13);
          background: linear-gradient(180deg, rgba(239, 252, 255, 0.28), rgba(126, 239, 255, 0.08) 52%, rgba(37, 60, 103, 0.1));
          box-shadow: 0 0 28px rgba(221, 243, 255, 0.16), inset 0 0 28px rgba(255, 255, 255, 0.08);
          opacity: 0.5;
        }

        .body-head {
          top: 20%;
          width: clamp(70px, 7.3vw, 108px);
          height: clamp(70px, 7.3vw, 108px);
          border-radius: 999px;
        }

        .body-neck {
          top: calc(20% + clamp(78px, 7.8vw, 116px));
          width: 36px;
          height: 44px;
          border-radius: 999px;
          opacity: 0.24;
        }

        .body-torso {
          top: calc(20% + clamp(118px, 11vw, 166px));
          width: clamp(112px, 10vw, 156px);
          height: clamp(150px, 16vh, 220px);
          border-radius: 999px 999px 48px 48px;
        }

        .body-arm {
          top: calc(20% + clamp(140px, 12.2vw, 190px));
          width: clamp(16px, 1.6vw, 24px);
          height: clamp(112px, 14vh, 176px);
          border-radius: 999px;
          opacity: 0.36;
        }

        .body-arm-left { transform: translateX(calc(-1 * clamp(88px, 8.4vw, 132px))) rotate(12deg); }
        .body-arm-right { transform: translateX(clamp(68px, 7.2vw, 108px)) rotate(-12deg); }

        .body-leg {
          top: calc(20% + clamp(285px, 27vh, 390px));
          width: clamp(17px, 1.7vw, 25px);
          height: clamp(120px, 16vh, 188px);
          border-radius: 999px;
          opacity: 0.28;
        }

        .body-leg-left { transform: translateX(-34px) rotate(4deg); }
        .body-leg-right { transform: translateX(14px) rotate(-4deg); }

        .hotspot {
          position: absolute;
          z-index: 48;
          border: 0;
          background: transparent;
          pointer-events: auto;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .hotspot:focus-visible,
        .life-map-affordance:focus-visible,
        .home-whisper-close:focus-visible {
          outline: 2px solid rgba(126, 239, 255, 0.95);
          outline-offset: 5px;
        }

        .hotspot-orb {
          left: 50%;
          top: min(61vh, 650px);
          width: clamp(104px, 11vw, 168px);
          height: clamp(104px, 11vw, 168px);
          transform: translate(-50%, -50%);
          border-radius: 999px;
        }

        .hotspot-avatar {
          left: calc(50% - min(17vw, 280px));
          top: 26%;
          width: clamp(70px, 9vw, 150px);
          height: clamp(190px, 34vh, 360px);
          border-radius: 999px;
        }

        .hotspot-ground {
          left: 10%;
          right: 10%;
          bottom: 3%;
          height: min(18vh, 180px);
          border-radius: 999px 999px 0 0;
        }

        .home-orb,
        .orb-halo,
        .orb-core,
        .orb-shell,
        .orb-glint,
        .orb-particle {
          position: absolute;
          display: block;
          border-radius: 999px;
          pointer-events: none;
        }

        .home-orb {
          inset: 0;
          animation: orbPulse 6.8s ease-in-out infinite;
        }

        .halo-outer {
          inset: -78%;
          background: radial-gradient(circle, rgba(126, 239, 255, 0.22), rgba(143, 175, 234, 0.13) 38%, transparent 69%);
          filter: blur(8px);
        }

        .halo-inner {
          inset: -18%;
          border: 1px solid rgba(234, 255, 255, 0.16);
          box-shadow: 0 0 64px rgba(126, 239, 255, 0.48), 0 0 120px rgba(143, 175, 234, 0.3);
          background: radial-gradient(circle, rgba(126, 239, 255, 0.16), transparent 62%);
        }

        .orb-core {
          inset: 16%;
          background:
            radial-gradient(circle at 44% 36%, #ffffff 0%, #eaffff 22%, #a9f8ff 48%, rgba(73, 206, 255, 0.46) 66%, transparent 78%),
            rgba(126, 239, 255, 0.4);
          box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.52), 0 0 36px rgba(126, 239, 255, 0.75);
        }

        .orb-shell {
          inset: 8%;
          border: 1px solid rgba(255, 255, 255, 0.48);
          background:
            radial-gradient(circle at 38% 28%, rgba(255, 255, 255, 0.8), transparent 18%),
            radial-gradient(circle at 70% 74%, rgba(144, 118, 255, 0.2), transparent 34%);
          box-shadow: inset 0 -12px 30px rgba(38, 84, 130, 0.28);
        }

        .glint-a { width: 14%; height: 14%; left: 31%; top: 24%; background: rgba(255, 255, 255, 0.9); filter: blur(1px); }
        .glint-b { width: 5%; height: 5%; right: 27%; top: 33%; background: rgba(255, 255, 255, 0.78); }

        .orb-particle {
          width: 5px;
          height: 5px;
          background: rgba(234, 255, 255, 0.82);
          box-shadow: 0 0 12px rgba(126, 239, 255, 0.86);
          animation: orbMote 12s ease-in-out infinite;
        }

        .particle-a { left: -10%; top: 38%; animation-delay: -2s; }
        .particle-b { right: -7%; top: 62%; width: 4px; height: 4px; animation-delay: -5s; }
        .particle-c { left: 52%; bottom: -14%; width: 3px; height: 3px; animation-delay: -8s; }

        .home-ground-field {
          position: absolute;
          left: -8%;
          right: -8%;
          bottom: -9%;
          z-index: 14;
          height: 35vh;
          pointer-events: none;
          overflow: hidden;
        }

        .ground-horizon,
        .terrain,
        .root,
        .avatar-shadow,
        .orb-reflection,
        .mist {
          position: absolute;
          display: block;
          pointer-events: none;
        }

        .ground-horizon {
          left: 0;
          right: 0;
          top: 8%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(126, 239, 255, 0.24), rgba(255, 255, 255, 0.11), transparent);
          box-shadow: 0 0 28px rgba(126, 239, 255, 0.18);
        }

        .terrain {
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 50% 50% 0 0;
        }

        .terrain-back {
          top: 8%;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(126, 239, 255, 0.16), transparent 35%),
            radial-gradient(ellipse at 22% 40%, rgba(215, 177, 106, 0.1), transparent 28%),
            linear-gradient(180deg, rgba(23, 42, 72, 0.62), rgba(6, 13, 25, 0.2) 70%);
          opacity: 0.84;
        }

        .terrain-front {
          top: 35%;
          background:
            radial-gradient(ellipse at 50% 12%, rgba(126, 239, 255, 0.08), transparent 24%),
            linear-gradient(180deg, rgba(15, 28, 47, 0.52), rgba(2, 8, 18, 0.78));
        }

        .avatar-shadow {
          left: 50%;
          top: 21%;
          width: min(32vw, 520px);
          height: 20%;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(ellipse, rgba(1, 5, 14, 0.42), rgba(1, 5, 14, 0.14) 48%, transparent 72%);
          filter: blur(14px);
        }

        .orb-reflection {
          left: 50%;
          top: 15%;
          width: min(22vw, 320px);
          height: 18%;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(ellipse, rgba(126, 239, 255, 0.28), rgba(126, 239, 255, 0.08) 46%, transparent 72%);
          filter: blur(8px);
          animation: reflectionPulse 8s ease-in-out infinite;
        }

        .root {
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(215, 177, 106, 0.5), rgba(126, 239, 255, 0.18), transparent);
          opacity: 0.42;
          animation: rootGlow 13s ease-in-out infinite;
        }

        .root-a { left: 35%; top: 32%; width: 21%; transform: rotate(8deg); animation-delay: -3s; }
        .root-b { left: 43%; top: 45%; width: 26%; transform: rotate(-6deg); animation-delay: -7s; }
        .root-c { left: 24%; top: 56%; width: 18%; transform: rotate(-11deg); animation-delay: -10s; }

        .mist {
          left: 0;
          right: 0;
          border-radius: 999px;
          filter: blur(18px);
          opacity: 0.5;
        }

        .mist-far {
          top: 10%;
          height: 24%;
          background: linear-gradient(90deg, transparent, rgba(206, 229, 255, 0.18), transparent);
          animation: mistDrift 32s linear infinite;
        }

        .mist-near {
          top: 44%;
          height: 30%;
          background: linear-gradient(90deg, transparent, rgba(126, 239, 255, 0.1), rgba(255, 255, 255, 0.08), transparent);
          animation: mistDrift 42s linear infinite reverse;
        }

        .life-map-affordance {
          position: absolute;
          right: max(22px, env(safe-area-inset-right));
          top: max(22px, env(safe-area-inset-top));
          z-index: 56;
          pointer-events: auto;
          border: 1px solid rgba(221, 247, 255, 0.2);
          border-radius: 999px;
          background: rgba(3, 9, 24, 0.28);
          color: rgba(245, 251, 255, 0.82);
          box-shadow: 0 16px 44px rgba(0, 0, 0, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(16px);
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.16em;
          line-height: 1;
          padding: 12px 15px;
          text-transform: uppercase;
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease;
        }

        .life-map-affordance:hover {
          transform: translateY(-1px);
          border-color: rgba(126, 239, 255, 0.55);
          background: rgba(9, 22, 49, 0.48);
          color: #ffffff;
        }

        .home-whisper {
          position: absolute;
          left: max(22px, env(safe-area-inset-left));
          bottom: max(22px, env(safe-area-inset-bottom));
          z-index: 58;
          width: min(380px, calc(100vw - 44px));
          pointer-events: auto;
          border: 1px solid rgba(221, 247, 255, 0.14);
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(4, 12, 30, 0.64), rgba(2, 6, 16, 0.54));
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(22px);
          padding: 20px 20px 18px;
          animation: whisperIn 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .home-whisper-close {
          position: absolute;
          right: 12px;
          top: 12px;
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.82);
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
        }

        .home-whisper-eyebrow {
          color: rgba(126, 239, 255, 0.9);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.2em;
          margin-right: 38px;
          text-transform: uppercase;
        }

        .home-whisper h2 {
          color: #ffffff;
          font-size: clamp(25px, 2.8vw, 34px);
          letter-spacing: -0.055em;
          line-height: 0.98;
          margin: 8px 38px 8px 0;
        }

        .home-whisper p {
          color: rgba(234, 241, 252, 0.78);
          font-size: 14px;
          font-weight: 650;
          line-height: 1.5;
          margin: 0;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        [data-transitioning="true"] .home-sky-atmosphere,
        [data-transitioning="true"] .home-avatar-field,
        [data-transitioning="true"] .home-orb,
        [data-transitioning="true"] .home-ground-field {
          opacity: 0.82;
          transform: scale(1.035);
          transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 900ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes avatarBreath { 0%, 100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 0.94; } 50% { transform: translateX(-50%) translateY(-2px) scale(1.012); opacity: 1; } }
        @keyframes orbPulse { 0%, 100% { transform: scale(1); opacity: 0.86; filter: saturate(1); } 50% { transform: scale(1.035); opacity: 1; filter: saturate(1.12); } }
        @keyframes orbMote { 0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.3; } 50% { transform: translate3d(8px, -11px, 0); opacity: 0.95; } }
        @keyframes skyBreath { 0%, 100% { transform: scale(0.96); opacity: 0.56; } 50% { transform: scale(1.08); opacity: 0.82; } }
        @keyframes auroraDrift { from { transform: translateX(-5%) rotate(-8deg); } to { transform: translateX(5%) rotate(-8deg); } }
        @keyframes starPulse { 0%, 100% { transform: scale(0.84); opacity: 0.42; } 50% { transform: scale(1.18); opacity: 0.94; } }
        @keyframes mistDrift { from { transform: translateX(-8%); } to { transform: translateX(8%); } }
        @keyframes rootGlow { 0%, 100% { opacity: 0.22; } 50% { opacity: 0.58; } }
        @keyframes reflectionPulse { 0%, 100% { transform: translateX(-50%) scaleX(0.92); opacity: 0.42; } 50% { transform: translateX(-50%) scaleX(1.08); opacity: 0.72; } }
        @keyframes whisperIn { from { opacity: 0; transform: translateY(8px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }

        @media (max-width: 760px) {
          .home-avatar-field { top: 18%; width: min(58vw, 280px); height: 63vh; }
          .hotspot-orb { top: 63vh; width: clamp(94px, 31vw, 132px); height: clamp(94px, 31vw, 132px); }
          .hotspot-avatar { left: 8%; top: 24%; width: 82px; height: 260px; }
          .hotspot-ground { left: 5%; right: 5%; bottom: 2%; height: 20vh; }
          .home-ground-field { height: 33vh; bottom: -8%; }
          .life-map-affordance { top: max(14px, env(safe-area-inset-top)); right: max(14px, env(safe-area-inset-right)); font-size: 10px; letter-spacing: 0.14em; padding: 10px 12px; }
          .home-whisper { left: 14px; right: 14px; bottom: max(14px, env(safe-area-inset-bottom)); width: auto; border-radius: 24px; padding: 18px; }
          .home-whisper h2 { font-size: 26px; }
          .aurora { width: 110vw; height: 18vh; }
        }

        @media (min-width: 1400px) {
          .home-avatar-field { top: 13%; height: 70vh; }
          .hotspot-orb { top: 60vh; }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-avatar-field,
          .home-orb,
          .orb-particle,
          .sky-glow,
          .aurora,
          .star,
          .root,
          .mist,
          .orb-reflection,
          .home-whisper {
            animation: none;
          }

          .life-map-affordance,
          [data-transitioning="true"] .home-sky-atmosphere,
          [data-transitioning="true"] .home-avatar-field,
          [data-transitioning="true"] .home-orb,
          [data-transitioning="true"] .home-ground-field {
            transition-duration: 120ms;
          }
        }
      `}</style>
    </div>
  );
}

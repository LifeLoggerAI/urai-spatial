"use client";

import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export default function LifeMapClient() {
  return (
    <>
      <TierOneExperience mode="life-map" />
      <style jsx global>{`
        body:has(.urai-cinematic-life-map) {
          background: #00030a;
        }

        .urai-cinematic-life-map {
          background:
            radial-gradient(circle at 18% 18%, rgba(56, 189, 248, 0.24), transparent 27rem),
            radial-gradient(circle at 83% 30%, rgba(168, 85, 247, 0.25), transparent 32rem),
            radial-gradient(circle at 50% 80%, rgba(34, 197, 94, 0.09), transparent 26rem),
            linear-gradient(180deg, #020817 0%, #03020f 48%, #00030a 100%) !important;
          perspective: 1400px !important;
        }

        .urai-cinematic-life-map::before,
        .urai-cinematic-life-map::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .urai-cinematic-life-map::before {
          z-index: 13;
          background:
            radial-gradient(circle at 50% 47%, transparent 0 34%, rgba(3, 7, 18, 0.18) 48%, rgba(0, 0, 0, 0.74) 100%),
            linear-gradient(90deg, rgba(0, 0, 0, 0.46), transparent 16%, transparent 84%, rgba(0, 0, 0, 0.5));
          mix-blend-mode: multiply;
        }

        .urai-cinematic-life-map::after {
          z-index: 8;
          background-image:
            radial-gradient(circle, rgba(255, 255, 255, 0.78) 0 1px, transparent 1.55px),
            radial-gradient(circle, rgba(125, 211, 252, 0.46) 0 1px, transparent 1.7px),
            radial-gradient(circle, rgba(216, 180, 254, 0.48) 0 1px, transparent 1.8px);
          background-size: 137px 137px, 239px 239px, 383px 383px;
          background-position: 50% 50%, 18% 35%, 82% 18%;
          opacity: 0.5;
          filter: drop-shadow(0 0 12px rgba(125, 211, 252, 0.2));
          animation: uraiLifeMapStars 18s ease-in-out infinite alternate;
        }

        .urai-cinematic-life-map .lm-horizon,
        .urai-cinematic-life-map .lm-ground {
          display: none !important;
        }

        .urai-cinematic-life-map .lm-sky {
          inset: -18% !important;
          opacity: 0.33 !important;
          transform: translateZ(-560px) scale(1.28) !important;
        }

        .urai-cinematic-life-map .lm-nebula {
          filter: blur(34px) saturate(1.38) !important;
          opacity: 0.86 !important;
        }

        .urai-cinematic-life-map .lm-depth-grid {
          inset: 7% 3% 3% !important;
          transform: rotateX(70deg) translateZ(-90px) scale(1.08) !important;
          opacity: 0.54 !important;
          mask-image: linear-gradient(90deg, transparent, black 18%, black 82%, transparent);
        }

        .urai-cinematic-life-map .lm-title-panel {
          width: min(21rem, calc(100vw - 1.5rem)) !important;
          padding: 0.75rem 0.9rem !important;
          border-radius: 1rem !important;
          background: linear-gradient(145deg, rgba(3, 7, 18, 0.58), rgba(15, 23, 42, 0.3)) !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
        }

        .urai-cinematic-life-map .lm-title-panel h1 {
          font-size: clamp(1.35rem, 2.4vw, 2.1rem) !important;
          line-height: 0.92 !important;
          letter-spacing: -0.05em !important;
        }

        .urai-cinematic-life-map .lm-title-panel span {
          font-size: 0 !important;
        }

        .urai-cinematic-life-map .lm-title-panel span::after {
          content: "Every light is a lived moment. Choose a star. The map will move with you.";
          display: block;
          margin-top: 0.44rem;
          color: rgba(226, 232, 240, 0.74);
          font-size: 0.82rem;
          line-height: 1.34;
        }

        .urai-cinematic-life-map .lm-camera {
          inset: -7% -6% -5% !important;
          transition: transform 620ms cubic-bezier(0.2, 0.8, 0.2, 1) !important;
        }

        .urai-cinematic-life-map .lm-edge {
          stroke-dasharray: 1.2 2.7 !important;
          opacity: 0.18 !important;
        }

        .urai-cinematic-life-map .lm-edge-active {
          opacity: 0.92 !important;
          stroke-width: 0.3 !important;
          stroke-dasharray: 2.4 1.2 !important;
        }

        .urai-cinematic-life-map .lm-star-core {
          overflow: hidden !important;
          background:
            linear-gradient(130deg, transparent 0 42%, color-mix(in srgb, var(--node-aura) 28%, transparent) 43% 48%, transparent 49%),
            radial-gradient(circle at 35% 34%, rgba(255, 255, 255, 0.9), transparent 15%),
            radial-gradient(circle at 65% 68%, color-mix(in srgb, var(--node-color) 72%, transparent), transparent 46%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.35), rgba(2, 6, 23, 0.9)) !important;
          border-color: color-mix(in srgb, var(--node-aura) 62%, transparent) !important;
          box-shadow:
            0 0 28px color-mix(in srgb, var(--node-aura) 76%, transparent),
            0 0 72px color-mix(in srgb, var(--node-color) 44%, transparent),
            inset 0 0 24px rgba(255, 255, 255, 0.18) !important;
        }

        .urai-cinematic-life-map .lm-star-core::after {
          content: "";
          position: absolute;
          left: 10%;
          right: 10%;
          bottom: 28%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.78), transparent);
          box-shadow: 0 0 18px var(--node-aura);
        }

        .urai-cinematic-life-map .lm-memory-star-active .lm-star-core {
          transform: scale(1.24) !important;
          border-color: color-mix(in srgb, var(--node-aura) 84%, white) !important;
          filter: saturate(1.35) contrast(1.08) !important;
          box-shadow:
            0 0 42px color-mix(in srgb, var(--node-aura) 90%, transparent),
            0 0 112px color-mix(in srgb, var(--node-color) 62%, transparent),
            inset 0 0 30px rgba(255, 255, 255, 0.24) !important;
        }

        .urai-cinematic-life-map .lm-memory-capsule {
          transform: translate(-50%, calc(-100% - 4rem)) !important;
          border-radius: 1.65rem !important;
          background:
            linear-gradient(145deg, color-mix(in srgb, var(--capsule-color) 10%, rgba(3, 8, 20, 0.88)), rgba(15, 23, 42, 0.6)),
            radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--capsule-color) 18%, transparent), transparent 9rem) !important;
        }

        .urai-cinematic-life-map .lm-memory-capsule::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -4.1rem;
          width: 2px;
          height: 4.3rem;
          transform: translateX(-50%);
          background: linear-gradient(180deg, color-mix(in srgb, var(--capsule-color) 82%, transparent), transparent);
          box-shadow: 0 0 18px var(--capsule-color);
        }

        .urai-cinematic-life-map .lm-capsule-actions button:first-child {
          order: 2;
          font-size: 0 !important;
          background: rgba(15, 23, 42, 0.72) !important;
          color: #f8fbff !important;
        }

        .urai-cinematic-life-map .lm-capsule-actions button:first-child::after {
          content: "Enter Memory";
          font-size: 1rem;
        }

        .urai-cinematic-life-map .lm-capsule-actions button:nth-child(2) {
          order: 1;
          font-size: 0 !important;
          color: #020617 !important;
          background: linear-gradient(135deg, rgba(125, 211, 252, 0.96), rgba(192, 132, 252, 0.86)) !important;
          border-color: rgba(255, 255, 255, 0.36) !important;
        }

        .urai-cinematic-life-map .lm-capsule-actions button:nth-child(2)::after {
          content: "Open Replay";
          font-size: 1rem;
        }

        .urai-cinematic-life-map .lm-capsule-actions button:nth-child(3) {
          order: 3;
        }

        .urai-cinematic-life-map .lm-orb-companion {
          border-color: color-mix(in srgb, #67e8f9 24%, rgba(255, 255, 255, 0.12)) !important;
          background: linear-gradient(145deg, rgba(2, 6, 23, 0.52), rgba(15, 23, 42, 0.48)) !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.34), 0 0 48px rgba(103, 232, 249, 0.18) !important;
        }

        .urai-cinematic-life-map .lm-orb-companion button::before {
          content: "";
          position: absolute;
          inset: 0.24rem;
          border-radius: 999px;
          border: 1px solid rgba(103, 232, 249, 0.68);
          box-shadow: 0 0 26px rgba(103, 232, 249, 0.42);
          animation: uraiLifeMapOrbScan 2.8s ease-out infinite;
        }

        .urai-cinematic-life-map .lm-hud div:nth-of-type(3) {
          display: none !important;
        }

        .urai-cinematic-life-map .lm-hud p {
          font-size: 0 !important;
        }

        .urai-cinematic-life-map .lm-hud p::after {
          content: "Drag empty space to orbit. Arrow keys step memories. Double-click a star to enter.";
          color: rgba(226, 232, 240, 0.74);
          font-size: 0.78rem;
          line-height: 1.42;
        }

        .urai-cinematic-life-map .lm-hud button:last-child {
          font-size: 0 !important;
        }

        .urai-cinematic-life-map .lm-hud button:last-child::after {
          content: "Enter Memory";
          font-size: 0.9rem;
        }

        .urai-cinematic-life-map .lm-route-stones a:nth-child(2) {
          color: #020617 !important;
          background: linear-gradient(135deg, rgba(125, 211, 252, 0.96), rgba(192, 132, 252, 0.86)) !important;
        }

        @keyframes uraiLifeMapStars {
          to { transform: translate3d(1.6rem, -1.1rem, 0); }
        }

        @keyframes uraiLifeMapOrbScan {
          0% { transform: scale(0.86); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        @media (max-width: 720px) {
          .urai-cinematic-life-map .lm-title-panel h1 { font-size: 1.65rem !important; }
          .urai-cinematic-life-map .lm-title-panel span::after { font-size: 0.8rem; }
        }
      `}</style>
    </>
  );
}

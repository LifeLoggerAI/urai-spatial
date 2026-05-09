"use client";

import type { TierOneExperienceMode } from "./TierOneExperience";

const modeCopy: Record<TierOneExperienceMode, { label: string; whisper: string }> = {
  home: {
    label: "Embodied present",
    whisper: "The orb is present. The sky is alive. The ground is steady.",
  },
  ascent: {
    label: "Sky opening",
    whisper: "Present atmosphere is opening into remembered space.",
  },
  "life-map": {
    label: "Life horizon",
    whisper: "The galaxy behind today is settling around the current region.",
  },
  demo: {
    label: "Public-safe preview",
    whisper: "Local symbolic memory lights only; no private signal is exposed.",
  },
  focus: {
    label: "Memory bloom",
    whisper: "A single star is becoming a private memory portal.",
  },
  replay: {
    label: "Thread replay",
    whisper: "The pattern is revealing itself along the constellation path.",
  },
  unwind: {
    label: "Safe return",
    whisper: "The light path is folding back toward the present.",
  },
  mirror: {
    label: "Mirror of becoming",
    whisper: "The thread condenses into one calm symbolic pattern.",
  },
};

type Props = {
  mode: TierOneExperienceMode;
};

export function SpatialCinematicContinuityLayer({ mode }: Props) {
  const copy = modeCopy[mode];

  return (
    <div
      className="urai-cinematic-continuity"
      data-testid="urai-cinematic-continuity"
      data-urai-cinematic-mode={mode}
      aria-hidden="true"
    >
      <span className="urai-cinematic-continuity__mist urai-cinematic-continuity__mist--one" />
      <span className="urai-cinematic-continuity__mist urai-cinematic-continuity__mist--two" />
      <span className="urai-cinematic-continuity__orb-thread" />
      <span className="urai-cinematic-continuity__council urai-cinematic-continuity__council--one" />
      <span className="urai-cinematic-continuity__council urai-cinematic-continuity__council--two" />
      <span className="urai-cinematic-continuity__council urai-cinematic-continuity__council--three" />
      <span className="urai-cinematic-continuity__threshold" />
      <span className="urai-cinematic-continuity__recovery" />
      <span className="urai-cinematic-continuity__social" />
      <span className="urai-cinematic-continuity__sr-label">{copy.label}. {copy.whisper}</span>
      <style jsx>{`
        .urai-cinematic-continuity {
          position: absolute;
          inset: 0;
          z-index: 18;
          pointer-events: none;
          overflow: hidden;
          mix-blend-mode: screen;
        }

        .urai-cinematic-continuity::before,
        .urai-cinematic-continuity::after {
          content: "";
          position: absolute;
          inset: -16%;
          pointer-events: none;
        }

        .urai-cinematic-continuity::before {
          background:
            radial-gradient(circle at 50% 34%, rgba(103, 232, 249, 0.14), transparent 22%),
            radial-gradient(circle at 48% 58%, rgba(226, 246, 255, 0.09), transparent 32%),
            radial-gradient(circle at 74% 22%, rgba(168, 85, 247, 0.12), transparent 28%);
          filter: blur(12px);
          opacity: 0.58;
          animation: uraiContinuityBreath 14s ease-in-out infinite;
        }

        .urai-cinematic-continuity::after {
          background:
            radial-gradient(circle at 20% 70%, rgba(34, 197, 94, 0.07), transparent 20%),
            radial-gradient(circle at 78% 68%, rgba(251, 191, 36, 0.08), transparent 24%),
            linear-gradient(180deg, transparent 0 62%, rgba(2, 6, 23, 0.24) 100%);
          opacity: 0.62;
        }

        .urai-cinematic-continuity__mist,
        .urai-cinematic-continuity__orb-thread,
        .urai-cinematic-continuity__council,
        .urai-cinematic-continuity__threshold,
        .urai-cinematic-continuity__recovery,
        .urai-cinematic-continuity__social {
          position: absolute;
          display: block;
          pointer-events: none;
        }

        .urai-cinematic-continuity__mist {
          width: 58vw;
          height: 20vh;
          border-radius: 999px;
          filter: blur(28px);
          opacity: 0.22;
          background: rgba(190, 226, 255, 0.38);
          animation: uraiContinuityMist 22s ease-in-out infinite;
        }

        .urai-cinematic-continuity__mist--one {
          left: -18vw;
          top: 28vh;
        }

        .urai-cinematic-continuity__mist--two {
          right: -20vw;
          top: 48vh;
          background: rgba(196, 181, 253, 0.34);
          animation-delay: -9s;
        }

        .urai-cinematic-continuity__orb-thread {
          left: 50%;
          top: 14%;
          width: 1px;
          height: 60vh;
          transform: translateX(-50%);
          background: linear-gradient(180deg, transparent, rgba(125, 239, 255, 0.34), rgba(251, 191, 36, 0.12), transparent);
          box-shadow: 0 0 24px rgba(103, 232, 249, 0.26), 0 0 72px rgba(139, 92, 246, 0.14);
          opacity: 0.34;
        }

        .urai-cinematic-continuity__council {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(226, 246, 255, 0.86);
          box-shadow: 0 0 18px rgba(125, 239, 255, 0.72), 0 0 44px rgba(139, 92, 246, 0.22);
          animation: uraiCouncilGuide 9s ease-in-out infinite;
        }

        .urai-cinematic-continuity__council--one { left: 28%; top: 24%; }
        .urai-cinematic-continuity__council--two { left: 66%; top: 20%; animation-delay: -3s; }
        .urai-cinematic-continuity__council--three { left: 78%; top: 56%; animation-delay: -6s; }

        .urai-cinematic-continuity__threshold,
        .urai-cinematic-continuity__recovery,
        .urai-cinematic-continuity__social {
          border-radius: 999px;
          border: 1px solid transparent;
          opacity: 0.24;
        }

        .urai-cinematic-continuity__threshold {
          left: 63%;
          top: 31%;
          width: 84px;
          height: 84px;
          border-color: rgba(251, 191, 36, 0.24);
          box-shadow: 0 0 44px rgba(251, 191, 36, 0.08), inset 0 0 30px rgba(139, 92, 246, 0.12);
        }

        .urai-cinematic-continuity__recovery {
          left: 24%;
          top: 65%;
          width: 120px;
          height: 42px;
          border-color: rgba(163, 230, 53, 0.18);
          box-shadow: 0 0 38px rgba(34, 197, 94, 0.08);
        }

        .urai-cinematic-continuity__social {
          right: 18%;
          bottom: 22%;
          width: 92px;
          height: 38px;
          border-color: rgba(251, 113, 133, 0.16);
          box-shadow: 0 0 38px rgba(251, 113, 133, 0.08);
        }

        .urai-cinematic-continuity[data-urai-cinematic-mode="home"] .urai-cinematic-continuity__orb-thread {
          opacity: 0.24;
        }

        .urai-cinematic-continuity[data-urai-cinematic-mode="ascent"] .urai-cinematic-continuity__orb-thread,
        .urai-cinematic-continuity[data-urai-cinematic-mode="life-map"] .urai-cinematic-continuity__orb-thread,
        .urai-cinematic-continuity[data-urai-cinematic-mode="demo"] .urai-cinematic-continuity__orb-thread {
          opacity: 0.62;
          animation: uraiOrbThreadOpen 1.25s ease both;
        }

        .urai-cinematic-continuity[data-urai-cinematic-mode="focus"] .urai-cinematic-continuity__threshold,
        .urai-cinematic-continuity[data-urai-cinematic-mode="replay"] .urai-cinematic-continuity__recovery,
        .urai-cinematic-continuity[data-urai-cinematic-mode="mirror"] .urai-cinematic-continuity__social {
          opacity: 0.5;
        }

        .urai-cinematic-continuity__sr-label {
          position: absolute;
          width: 1px;
          height: 1px;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
        }

        @keyframes uraiContinuityBreath {
          0%, 100% { transform: scale(0.98); opacity: 0.42; }
          50% { transform: scale(1.04); opacity: 0.72; }
        }

        @keyframes uraiContinuityMist {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(6vw, -2vh, 0); }
        }

        @keyframes uraiCouncilGuide {
          0%, 100% { transform: translate3d(0, 0, 0) scale(0.9); opacity: 0.46; }
          50% { transform: translate3d(0.8vw, -1vh, 0) scale(1.18); opacity: 0.92; }
        }

        @keyframes uraiOrbThreadOpen {
          from { transform: translateX(-50%) scaleY(0.18); opacity: 0.1; }
          to { transform: translateX(-50%) scaleY(1); opacity: 0.62; }
        }

        @media (max-width: 760px) {
          .urai-cinematic-continuity__threshold { left: 68%; top: 26%; width: 58px; height: 58px; }
          .urai-cinematic-continuity__recovery { left: 10%; top: 70%; width: 90px; }
          .urai-cinematic-continuity__social { right: 8%; bottom: 26%; width: 72px; }
          .urai-cinematic-continuity__council--three { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .urai-cinematic-continuity::before,
          .urai-cinematic-continuity__mist,
          .urai-cinematic-continuity__council,
          .urai-cinematic-continuity__orb-thread {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

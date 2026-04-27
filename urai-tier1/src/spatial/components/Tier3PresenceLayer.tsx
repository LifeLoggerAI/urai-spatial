"use client";

type Phase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY" | string;

export function Tier3PresenceLayer({ phase }: { phase: Phase }) {
  const p = String(phase || "HOME").toUpperCase();

  return (
    <div className={`urai-tier3-presence urai-tier3-${p}`} aria-hidden="true">
      <div className="urai-tier3-vignette" />
      <div className="urai-tier3-breath" />
      <div className="urai-tier3-memory-dust d1" />
      <div className="urai-tier3-memory-dust d2" />
      <div className="urai-tier3-memory-dust d3" />
      <div className="urai-tier3-presence-ring" />
      <style jsx>{`
        .urai-tier3-presence {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          overflow: hidden;
          mix-blend-mode: screen;
          opacity: 0.82;
          transition: opacity 900ms ease, background 1200ms ease;
        }

        .urai-tier3-vignette {
          position: absolute;
          inset: -12%;
          background:
            radial-gradient(circle at 50% 46%, rgba(158, 74, 255, 0.10), transparent 31%),
            radial-gradient(circle at 50% 52%, transparent 34%, rgba(5, 0, 18, 0.30) 76%, rgba(0, 0, 0, 0.62) 100%);
          opacity: 0.9;
          transition: opacity 900ms ease;
        }

        .urai-tier3-breath {
          position: absolute;
          left: 50%;
          top: 48%;
          width: 34vmin;
          height: 34vmin;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background:
            radial-gradient(circle, rgba(194, 104, 255, 0.13), rgba(122, 45, 255, 0.06) 42%, transparent 72%);
          filter: blur(18px);
          animation: uraiTier3Breath 5.8s ease-in-out infinite;
        }

        .urai-tier3-memory-dust {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle, rgba(226, 202, 255, 0.22) 0 1px, transparent 1.6px),
            radial-gradient(circle, rgba(142, 94, 255, 0.16) 0 1.3px, transparent 2px);
          background-size: 132px 132px, 211px 211px;
          opacity: 0.28;
          animation: uraiTier3Drift 24s linear infinite;
        }

        .urai-tier3-memory-dust.d2 {
          opacity: 0.17;
          background-size: 181px 181px, 277px 277px;
          animation-duration: 37s;
          transform: scale(1.15);
        }

        .urai-tier3-memory-dust.d3 {
          opacity: 0.11;
          background-size: 89px 89px, 344px 344px;
          animation-duration: 51s;
          transform: scale(1.35);
        }

        .urai-tier3-presence-ring {
          position: absolute;
          left: 50%;
          top: 48%;
          width: 42vmin;
          height: 42vmin;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          border: 1px solid rgba(194, 126, 255, 0.12);
          box-shadow:
            0 0 48px rgba(147, 71, 255, 0.11),
            inset 0 0 48px rgba(147, 71, 255, 0.08);
          opacity: 0;
          transition: opacity 900ms ease, width 900ms ease, height 900ms ease;
        }

        .urai-tier3-HOME {
          opacity: 0.46;
        }

        .urai-tier3-HOME .urai-tier3-breath {
          width: 26vmin;
          height: 26vmin;
          opacity: 0.52;
        }

        .urai-tier3-ASCENT {
          opacity: 0.68;
        }

        .urai-tier3-ASCENT .urai-tier3-vignette {
          opacity: 0.72;
        }

        .urai-tier3-LIFEMAP {
          opacity: 0.62;
        }

        .urai-tier3-LIFEMAP .urai-tier3-memory-dust {
          opacity: 0.34;
        }

        .urai-tier3-FOCUS {
          opacity: 0.82;
        }

        .urai-tier3-FOCUS .urai-tier3-presence-ring {
          opacity: 0.72;
          width: 48vmin;
          height: 48vmin;
        }

        .urai-tier3-FOCUS .urai-tier3-breath {
          width: 38vmin;
          height: 38vmin;
          opacity: 0.8;
        }

        .urai-tier3-REPLAY {
          opacity: 1;
          mix-blend-mode: screen;
        }

        .urai-tier3-REPLAY .urai-tier3-vignette {
          opacity: 1;
          background:
            radial-gradient(circle at 50% 47%, rgba(205, 136, 255, 0.16), transparent 27%),
            radial-gradient(circle at 50% 50%, rgba(115, 38, 210, 0.10), transparent 44%),
            radial-gradient(circle at 50% 52%, transparent 22%, rgba(13, 0, 28, 0.38) 66%, rgba(0, 0, 0, 0.74) 100%);
        }

        .urai-tier3-REPLAY .urai-tier3-presence-ring {
          opacity: 0.92;
          width: 62vmin;
          height: 62vmin;
          border-color: rgba(220, 173, 255, 0.16);
        }

        .urai-tier3-REPLAY .urai-tier3-breath {
          width: 54vmin;
          height: 54vmin;
          opacity: 0.95;
          animation-duration: 7.2s;
        }

        .urai-tier3-REPLAY .urai-tier3-memory-dust {
          opacity: 0.42;
          animation-duration: 34s;
        }

        @keyframes uraiTier3Breath {
          0%, 100% {
            transform: translate(-50%, -50%) scale(0.985);
            opacity: 0.58;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.055);
            opacity: 0.95;
          }
        }

        @keyframes uraiTier3Drift {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            transform: translate3d(-4%, -7%, 0) scale(1.04);
          }
        }
      `}</style>
    </div>
  );
}

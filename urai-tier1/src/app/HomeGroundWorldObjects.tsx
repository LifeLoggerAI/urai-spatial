"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const launchMemoryId = "quiet-reset";

const stones = [
  {
    href: "/life-map",
    className: "life",
    index: "01",
    label: "Life Map",
    detail: "Enter the constellation",
  },
  {
    href: `/focus?memoryId=${launchMemoryId}`,
    className: "focus",
    index: "02",
    label: "Focus",
    detail: "Hold one memory",
  },
  {
    href: `/replay?memoryId=${launchMemoryId}&manifestId=replay-recovery-thread`,
    className: "replay",
    index: "03",
    label: "Replay",
    detail: "Play the thread",
  },
  {
    href: "/privacy-controls",
    className: "privacy",
    index: "04",
    label: "Privacy",
    detail: "Keep control",
  },
];

function rememberLaunchMemory() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("urai-lifemap-selected-memory-id", launchMemoryId);
}

export default function HomeGroundWorldObjects() {
  const pathname = usePathname();
  const isHomeWorld = pathname === "/" || pathname === "/home" || pathname === "/ascent";

  if (!isHomeWorld) return null;

  return (
    <aside className="urai-home-ground-objects" aria-label="URAI ground route stones">
      <div className="urai-ground-plinth" aria-hidden="true">
        <span className="plinth-core" />
        <span className="plinth-ring ring-one" />
        <span className="plinth-ring ring-two" />
        <span className="plinth-shadow" />
      </div>

      <div className="urai-ground-trail" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <nav className="urai-ground-stones" aria-label="Ground shortcuts into URAI">
        {stones.map((stone) => (
          <Link
            key={stone.href}
            href={stone.href}
            className={`urai-ground-stone stone-${stone.className}`}
            onClick={rememberLaunchMemory}
          >
            <strong>{stone.index}</strong>
            <span>
              {stone.label}
              <small>{stone.detail}</small>
            </span>
          </Link>
        ))}
      </nav>

      <div className="urai-ground-foreground" aria-hidden="true" />

      <style jsx>{`
        .urai-home-ground-objects {
          position: fixed;
          inset: auto 0 0 0;
          height: min(42vh, 390px);
          z-index: 24;
          pointer-events: none;
          overflow: hidden;
          perspective: 1100px;
        }

        .urai-ground-plinth,
        .urai-ground-trail,
        .urai-ground-stones,
        .urai-ground-foreground {
          position: absolute;
          pointer-events: none;
        }

        .urai-ground-plinth {
          left: 50%;
          top: 20%;
          width: min(560px, 42vw);
          height: min(180px, 13vw);
          transform: translateX(-50%) rotateX(66deg) rotateZ(-1deg);
          transform-origin: 50% 50%;
          border-radius: 999px;
          border: 1px solid rgba(229, 252, 255, 0.22);
          background:
            radial-gradient(ellipse at 50% 48%, rgba(255,255,255,0.30), rgba(125,211,252,0.20) 34%, rgba(167,139,250,0.11) 66%, transparent 84%),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 24px),
            linear-gradient(180deg, rgba(13, 45, 71, 0.68), rgba(2, 6, 23, 0.2));
          box-shadow:
            0 0 120px rgba(103,232,249,0.22),
            0 44px 160px rgba(0,0,0,0.46),
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -42px 80px rgba(2,6,23,0.48);
        }

        .plinth-core,
        .plinth-ring,
        .plinth-shadow {
          position: absolute;
          border-radius: 999px;
          inset: 50%;
          transform: translate(-50%, -50%);
        }

        .plinth-core {
          width: 18px;
          height: 18px;
          background: #ecfeff;
          box-shadow:
            0 0 34px rgba(255,255,255,0.85),
            0 0 86px rgba(103,232,249,0.72),
            120px 22px 0 -4px rgba(125,211,252,0.9),
            -130px 28px 0 -5px rgba(167,139,250,0.88),
            210px 44px 0 -6px rgba(134,239,172,0.86),
            -235px 52px 0 -6px rgba(125,211,252,0.86);
        }

        .ring-one {
          width: 48%;
          height: 58%;
          border: 1px solid rgba(229,252,255,0.19);
        }

        .ring-two {
          width: 78%;
          height: 86%;
          border: 1px solid rgba(125,211,252,0.13);
        }

        .plinth-shadow {
          width: 88%;
          height: 74%;
          top: 68%;
          background: radial-gradient(ellipse, rgba(0,0,0,0.42), transparent 72%);
          filter: blur(12px);
        }

        .urai-ground-trail {
          left: 18%;
          right: 18%;
          top: 37%;
          height: 80px;
          transform: rotateX(64deg) rotateZ(-3deg);
          transform-origin: 50% 50%;
        }

        .urai-ground-trail span {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(236,254,255,0.68), rgba(103,232,249,0.38), transparent);
          box-shadow: 0 0 36px rgba(103,232,249,0.26);
        }

        .urai-ground-trail span:nth-child(1) { top: 14px; }
        .urai-ground-trail span:nth-child(2) { top: 38px; opacity: 0.62; transform: scaleX(0.74); }
        .urai-ground-trail span:nth-child(3) { top: 64px; opacity: 0.38; transform: scaleX(0.48); }

        .urai-ground-stones {
          inset: 0;
          pointer-events: none;
        }

        .urai-ground-stone {
          position: absolute;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 9px;
          min-width: 138px;
          padding: 10px 12px;
          pointer-events: auto;
          color: #eef8ff;
          text-decoration: none;
          border: 1px solid rgba(229,252,255,0.22);
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(2,6,23,0.74), rgba(15,23,42,0.46));
          box-shadow:
            0 28px 90px rgba(0,0,0,0.42),
            0 0 45px rgba(103,232,249,0.12),
            inset 0 1px 0 rgba(255,255,255,0.11);
          backdrop-filter: blur(16px);
          transform: perspective(800px) rotateX(54deg) rotateZ(-2deg);
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }

        .urai-ground-stone strong {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: rgba(103,232,249,0.18);
          color: #67e8f9;
          font-size: 0.72rem;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.13), 0 0 28px rgba(103,232,249,0.17);
        }

        .urai-ground-stone span {
          display: grid;
          gap: 2px;
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .urai-ground-stone small {
          color: rgba(218, 244, 255, 0.62);
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .urai-ground-stone:hover,
        .urai-ground-stone:focus-visible {
          outline: none;
          transform: perspective(800px) rotateX(48deg) rotateZ(-1deg) translateY(-8px) scale(1.04);
          border-color: rgba(229,252,255,0.52);
          background: linear-gradient(145deg, rgba(8,47,73,0.82), rgba(49,46,129,0.54));
          box-shadow:
            0 32px 120px rgba(0,0,0,0.48),
            0 0 90px rgba(103,232,249,0.25),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .stone-life { left: 31%; top: 50%; }
        .stone-focus { left: 43%; top: 33%; }
        .stone-replay { left: 56%; top: 47%; }
        .stone-privacy { left: 68%; top: 30%; }

        .urai-ground-foreground {
          left: -8%;
          right: -8%;
          bottom: -18px;
          height: 128px;
          background:
            linear-gradient(180deg, transparent, rgba(1,4,12,0.78)),
            radial-gradient(ellipse at 50% 0%, rgba(103,232,249,0.12), transparent 58%);
          z-index: 4;
        }

        @media (max-width: 1080px) {
          .urai-home-ground-objects {
            height: 34vh;
          }

          .urai-ground-stone {
            min-width: 112px;
            padding: 8px 9px;
          }

          .stone-life { left: 25%; top: 55%; }
          .stone-focus { left: 42%; top: 40%; }
          .stone-replay { left: 58%; top: 55%; }
          .stone-privacy { display: none; }
        }

        @media (max-width: 760px) {
          .urai-home-ground-objects {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .urai-home-ground-objects * {
            transition: none !important;
          }
        }
      `}</style>
    </aside>
  );
}

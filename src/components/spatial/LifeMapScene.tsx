'use client';

import { type KeyboardEventHandler, useEffect, useState } from 'react';

const INTRO_HIDE_DELAY_MS = 1200;
const ORB_PULSE_MS = 380;

export default function LifeMapScene() {
  const [introDismissed, setIntroDismissed] = useState(false);
  const [introHidden, setIntroHidden] = useState(false);
  const [orbPulsing, setOrbPulsing] = useState(false);

  useEffect(() => {
    if (!introDismissed) return;
    const timer = window.setTimeout(() => setIntroHidden(true), INTRO_HIDE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [introDismissed]);

  const triggerOrbEntry = () => {
    if (orbPulsing) return;
    setIntroDismissed(true);
    setOrbPulsing(true);
    window.setTimeout(() => setOrbPulsing(false), ORB_PULSE_MS);
  };

  const onOrbKeyDown: KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      triggerOrbEntry();
    }
  };

  return (
    <main className="life-map-shell" aria-label="URAI Spatial Life Map scene">
      {!introHidden && (
        <section className={`intro-overlay ${introDismissed ? 'intro-overlay--dismissed' : ''}`}>
          <h1>URAI Spatial Life Map</h1>
          <p>A living map of memory, mood, and reflection.</p>
        </section>
      )}

      <p className="guidance">Open Life Map · Select a memory · Press Esc to return</p>

      <button
        type="button"
        className={`entry-orb ${orbPulsing ? 'entry-orb--pulse' : ''}`}
        onClick={triggerOrbEntry}
        onKeyDown={onOrbKeyDown}
        aria-label="Open Life Map"
      >
        Open Life Map
      </button>

      <aside className="narrator" aria-label="Narrator panel">
        <h2>A recurring memory pattern appeared.</h2>
        <p>URAI noticed this memory may connect to a repeating emotional pattern.</p>
        <button type="button" className="gentle-action">Replay gently</button>
      </aside>

      <p className="privacy-note">Your memories stay private. You control what is saved, replayed, or exported.</p>

      <style jsx>{`
        .life-map-shell {
          min-height: 100vh;
          color: #eef3ff;
          background: radial-gradient(circle at 50% 28%, #26366d, #0a0f20 58%, #05060f 100%);
          display: grid;
          align-content: center;
          justify-items: center;
          gap: 1rem;
          text-align: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }
        .intro-overlay {
          position: absolute;
          inset: 0;
          background: rgba(4, 8, 18, 0.8);
          display: grid;
          place-content: center;
          gap: 0.6rem;
          z-index: 2;
          transform: translateY(0);
          opacity: 1;
          transition: opacity 800ms ease, transform 800ms ease;
          pointer-events: none;
        }
        .intro-overlay--dismissed {
          opacity: 0;
          transform: translateY(-24px);
        }
        .guidance {
          font-size: 0.98rem;
          opacity: 0.9;
          letter-spacing: 0.01em;
        }
        .entry-orb {
          width: 10rem;
          height: 10rem;
          border-radius: 999px;
          border: 1px solid #9ec6ff;
          background: radial-gradient(circle at 35% 30%, #96e3ff, #406df0 55%, #1a1f48 100%);
          color: #f6f9ff;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 0 24px rgba(118, 173, 255, 0.55), 0 0 55px rgba(75, 94, 255, 0.35);
          transition: transform 220ms ease, box-shadow 220ms ease;
        }
        .entry-orb:hover {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 0 34px rgba(125, 204, 255, 0.75), 0 0 82px rgba(102, 120, 255, 0.55);
        }
        .entry-orb:focus-visible {
          outline: 3px solid #e9f3ff;
          outline-offset: 6px;
          box-shadow: 0 0 0 6px rgba(79, 147, 255, 0.45), 0 0 44px rgba(141, 216, 255, 0.92);
        }
        .entry-orb--pulse {
          animation: orbAscentPulse ${ORB_PULSE_MS}ms ease-in-out 1;
        }
        .narrator {
          margin-top: 0.6rem;
          max-width: 34rem;
          background: rgba(7, 10, 25, 0.75);
          border: 1px solid rgba(157, 196, 255, 0.32);
          border-radius: 1rem;
          padding: 1rem 1.2rem;
          text-align: left;
        }
        .narrator h2 {
          margin: 0 0 0.4rem;
          font-size: 1.05rem;
        }
        .narrator p {
          margin: 0;
          opacity: 0.92;
        }
        .gentle-action {
          margin-top: 0.8rem;
          border: 1px solid #8eb9ff;
          color: #edf4ff;
          background: rgba(71, 94, 200, 0.3);
          border-radius: 999px;
          padding: 0.4rem 0.9rem;
        }
        .privacy-note {
          position: absolute;
          bottom: 0.9rem;
          font-size: 0.82rem;
          opacity: 0.72;
        }
        @keyframes orbAscentPulse {
          0% { transform: translateY(0) scale(1); box-shadow: 0 0 24px rgba(118, 173, 255, 0.55), 0 0 55px rgba(75, 94, 255, 0.35); }
          50% { transform: translateY(-10px) scale(1.08); box-shadow: 0 0 52px rgba(152, 225, 255, 0.95), 0 0 110px rgba(109, 149, 255, 0.82); }
          100% { transform: translateY(-18px) scale(1.01); box-shadow: 0 0 40px rgba(150, 212, 255, 0.85), 0 0 90px rgba(106, 132, 255, 0.7); }
        }
      `}</style>
    </main>
  );
}

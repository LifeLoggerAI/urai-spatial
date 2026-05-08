"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LifeMapMode = "lifemap" | "focus" | "replay" | "home";

const nodes = [
  { id: "pattern-node", label: "Pattern Node", kind: "memory-thread", line: "A stable memory thread with recovery context." },
  { id: "forecast-node", label: "Forecast Path", kind: "forecast-path", line: "Mood weather and forecast signals are ready for provider sync." },
  { id: "ritual-node", label: "Ritual Marker", kind: "ritual-marker", line: "Replay can render emotional atmosphere from this node." },
];

export default function LifeMapReleaseSurface() {
  const [mode, setMode] = useState<LifeMapMode>("lifemap");
  const [selectedNode, setSelectedNode] = useState(nodes[0]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMode((current) => current === "replay" ? "focus" : current === "focus" ? "lifemap" : "home");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="lifemap-release" data-testid="urai-spatial-stage" data-mode={mode} data-reduced-motion={reducedMotion ? "true" : "false"}>
      <div className="starfield" data-testid="lifemap-starfield" aria-label="URAI Spatial LifeMap starfield">
        {nodes.map((node, index) => (
          <button
            key={node.id}
            type="button"
            className={`node node-${index}`}
            data-lifemap-node={node.id}
            data-lifemap-node-kind={node.kind}
            aria-label={`Open ${node.label}`}
            onClick={() => { setSelectedNode(node); setMode("focus"); }}
          >
            <span />
            {node.label}
          </button>
        ))}
      </div>

      <section className="lifemap-card" data-testid="urai-lifemap-scene">
        <p className="eyebrow">URAI Spatial LifeMap</p>
        <h1>Memory stars, constellations, and replay paths.</h1>
        <p>The LifeMap is fully usable in fallback mode. Private memory providers can replace these deterministic nodes without changing the route contract.</p>
        {mode === "home" ? <Link href="/">Return to home shell</Link> : null}
      </section>

      {mode === "focus" || mode === "replay" ? (
        <section className="focus-card" data-testid="urai-focus-card" aria-label="Focused LifeMap node">
          <p className="eyebrow">{selectedNode.kind}</p>
          <h2>{selectedNode.label}</h2>
          <p>{selectedNode.line}</p>
          <div className="actions">
            <button type="button" onClick={() => setMode("replay")}>Start replay</button>
            <button type="button" onClick={() => setMode("lifemap")}>Back to LifeMap</button>
          </div>
        </section>
      ) : null}

      {mode === "replay" ? (
        <aside className="replay" data-testid="urai-replay-overlay" aria-label="URAI replay overlay">
          <p className="eyebrow">Replay Stream</p>
          <strong>{selectedNode.label} is reconstructing as atmosphere.</strong>
          <div className="progress" aria-label="Replay progress"><span /></div>
          <p>Narrator: This moment is held gently. No diagnosis, only supportive context.</p>
        </aside>
      ) : null}

      <style jsx>{`
        .lifemap-release { position: fixed; inset: 0; overflow: hidden; color: white; background: radial-gradient(circle at 50% 35%, #152047, #040611 58%, #000); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        .starfield { position: absolute; inset: 0; }
        .starfield::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(255,255,255,.8) 1px, transparent 1px); background-size: 62px 62px; opacity: .24; }
        .node { position: absolute; display: grid; gap: 8px; justify-items: center; border: 0; background: transparent; color: white; cursor: pointer; }
        .node span { width: 22px; height: 22px; border-radius: 999px; background: #fff; box-shadow: 0 0 34px rgba(126,239,255,.95), 0 0 90px rgba(130,110,255,.5); }
        .node-0 { left: 30%; top: 34%; } .node-1 { left: 58%; top: 25%; } .node-2 { left: 66%; top: 58%; }
        .lifemap-card, .focus-card, .replay { position: absolute; z-index: 3; border: 1px solid rgba(255,255,255,.16); border-radius: 28px; background: rgba(7,10,22,.72); backdrop-filter: blur(18px); box-shadow: 0 24px 80px rgba(0,0,0,.38); padding: 20px; }
        .lifemap-card { left: 24px; bottom: 24px; max-width: 650px; }
        .focus-card { right: 24px; top: 24px; width: min(420px, calc(100vw - 48px)); }
        .replay { right: 24px; bottom: 24px; width: min(420px, calc(100vw - 48px)); }
        .eyebrow { color: #7defff; font-size: 12px; letter-spacing: .18em; text-transform: uppercase; }
        h1, h2 { margin: 8px 0; line-height: 1.05; }
        p { color: rgba(255,255,255,.76); line-height: 1.55; }
        button, a { border: 1px solid rgba(255,255,255,.18); border-radius: 999px; background: rgba(255,255,255,.12); color: white; padding: 10px 14px; cursor: pointer; text-decoration: none; }
        button:focus-visible, a:focus-visible { outline: 2px solid #7defff; outline-offset: 3px; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .progress { height: 8px; border-radius: 999px; background: rgba(255,255,255,.12); overflow: hidden; margin: 12px 0; }
        .progress span { display: block; width: 72%; height: 100%; background: linear-gradient(90deg,#7defff,#b99cff); }
        @media (max-width: 720px) { .lifemap-card, .focus-card, .replay { left: 12px; right: 12px; width: auto; } .focus-card { top: 12px; } .lifemap-card { bottom: 12px; } .replay { bottom: 170px; } }
        @media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
      `}</style>
    </main>
  );
}

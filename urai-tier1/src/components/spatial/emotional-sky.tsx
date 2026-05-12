"use client";

import type { LifeMapNode, MemoryStar } from "@/lib/firebase/firebaseSpatialSchema";

type Props = {
  nodes: Array<LifeMapNode & { id: string }>;
  stars: Array<MemoryStar & { id: string }>;
  labelsVisible?: boolean;
  onSky: () => void;
  onStar: (nodeId: string) => void;
};

export function EmotionalSky({ nodes, stars, labelsVisible = false, onSky, onStar }: Props) {
  return (
    <section className="emotionalSky" aria-label="Interactive emotional sky" onClick={(event) => { if (event.target === event.currentTarget) onSky(); }}>
      <button className="emotionalSky__zone" type="button" aria-label="Enter the Life Map through the sky" onClick={onSky}>Sky View</button>
      <svg className="emotionalSky__constellations" viewBox="0 0 100 60" aria-hidden="true">
        <path d="M18 27 C 32 18, 48 22, 61 16 S 82 24, 90 12" />
        <path d="M22 42 C 38 33, 56 39, 77 29" />
      </svg>
      {stars.map((star, index) => {
        const node = nodes.find((item) => item.id === star.nodeId);
        const left = 50 + star.position.x * 9;
        const top = 36 - star.position.y * 5;
        return (
          <button key={star.id} className="emotionalSky__star" type="button" aria-label={`Open memory star ${node?.title ?? star.label ?? index + 1}`} onClick={(event) => { event.stopPropagation(); onStar(star.nodeId); }} style={{ left: `${left}%`, top: `${top}%`, ["--pulse" as string]: `${star.pulseRate}s`, ["--glow" as string]: star.brightness, ["--star-color" as string]: node?.visual.color ?? "#9fe8ff" }}>
            <span />
            {labelsVisible ? <em>{node?.title ?? star.label}</em> : null}
          </button>
        );
      })}
      <style jsx>{`.emotionalSky{position:absolute;inset:0;overflow:hidden}.emotionalSky__zone{position:absolute;inset:0;border:0;background:transparent;color:transparent;cursor:pointer}.emotionalSky__zone:focus-visible{outline:2px solid rgba(163,230,255,.72);outline-offset:-8px}.emotionalSky__constellations{position:absolute;inset:6% 8% auto 8%;width:84%;height:44%;opacity:.32;filter:drop-shadow(0 0 12px rgba(100,220,255,.24))}.emotionalSky__constellations path{fill:none;stroke:rgba(160,225,255,.26);stroke-width:.35;stroke-dasharray:1.5 2}.emotionalSky__star{position:absolute;z-index:4;width:1.05rem;height:1.05rem;margin:-.5rem 0 0 -.5rem;border:0;border-radius:999px;background:transparent;cursor:pointer}.emotionalSky__star span{position:absolute;inset:34%;border-radius:999px;background:var(--star-color);box-shadow:0 0 calc(1.1rem * var(--glow)) var(--star-color);animation:twinkle var(--pulse) ease-in-out infinite}.emotionalSky__star:focus-visible{outline:2px solid #dff7ff;outline-offset:6px}.emotionalSky__star em{position:absolute;top:1rem;left:50%;width:max-content;max-width:9rem;transform:translateX(-50%);font-style:normal;font-size:.62rem;color:#cbeeff;background:rgba(4,12,24,.62);border:1px solid rgba(180,230,255,.18);border-radius:999px;padding:.2rem .45rem;white-space:nowrap}@keyframes twinkle{0%,100%{opacity:.44;transform:scale(.82)}50%{opacity:1;transform:scale(1.24)}}@media (max-width:640px){.emotionalSky__star em{display:none}.emotionalSky__constellations{opacity:.2}}@media (prefers-reduced-motion:reduce){.emotionalSky__star span{animation:none}}`}</style>
    </section>
  );
}

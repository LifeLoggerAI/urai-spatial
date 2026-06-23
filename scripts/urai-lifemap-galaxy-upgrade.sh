#!/usr/bin/env bash
set -euo pipefail

ROOT="${URAI_SPATIAL_DIR:-$PWD}"
if [ ! -d "$ROOT/urai-tier1" ]; then
  ROOT="${URAI_SPATIAL_DIR:-$HOME/urai-spatial}"
fi
TARGET="$ROOT/urai-tier1/src/spatial/v1/CinematicLifeMapScene.tsx"
export TARGET

if [ ! -f "$TARGET" ]; then
  echo "Could not find CinematicLifeMapScene.tsx at: $TARGET"
  echo "Run from ~/urai-spatial or set URAI_SPATIAL_DIR=/path/to/urai-spatial"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required but was not found. This repo already uses Node for Next.js, so check your shell PATH."
  exit 1
fi

cp "$TARGET" "$TARGET.bak.$(date +%Y%m%d%H%M%S)"
node <<'JS'
const fs = require('fs');
const target = process.env.TARGET;
let s = fs.readFileSync(target, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) {
    console.log(`skip: ${label} already changed or source text not found`);
    return;
  }
  s = s.replace(from, to);
  console.log(`patched: ${label}`);
};

replace('      <div className="lm-horizon" aria-hidden="true" />\n      <div className="lm-ground" aria-hidden="true" />\n', '', 'remove Home World horizon/ground markup');
replace('      <div className="lm-depth-grid" aria-hidden="true" />\n', '      <div className="lm-depth-grid" aria-hidden="true" />\n      <div className="lm-galaxy-rift" aria-hidden="true" />\n      <div className="lm-foreground-dust" aria-hidden="true" />\n', 'add rift and foreground dust layers');
replace('Step inside yourself. Click a memory star; the camera moves to it and opens the image/form inside.', 'You ascended from Home World. Every star is a memory, chapter, relationship, pattern, or future path you can enter.', 'upgrade title copy');
replace('The orb is reading the constellation. Choose a star and stay with it.', 'The orb is reading your private galaxy. Choose a star and the memory opens in-world.', 'upgrade orb copy');
replace('${node.title} is open. The memory image is inside the star; Focus enters it, Replay embodies it.', '${node.title} is open. Focus enters the chamber; Replay lets the memory move again.', 'upgrade selected memory copy');
replace('.lm-sky,\n.lm-nebula,\n.lm-depth-grid,\n.lm-horizon,\n.lm-ground {', '.lm-sky,\n.lm-nebula,\n.lm-depth-grid,\n.lm-galaxy-rift,\n.lm-foreground-dust,\n.lm-horizon,\n.lm-ground {', 'register new visual layers');
replace('    linear-gradient(180deg, #071426 0%, #030712 52%, #01030a 100%);', '    radial-gradient(ellipse at 50% 52%, rgba(14, 165, 233, 0.18), transparent 34rem),\n    radial-gradient(ellipse at 48% 58%, rgba(147, 51, 234, 0.16), transparent 42rem),\n    linear-gradient(180deg, #061126 0%, #020714 52%, #01030a 100%);', 'deepen galaxy background');
replace('opacity: 0.36;\n  filter: drop-shadow(0 0 10px rgba(125,211,252,0.22));', 'opacity: 0.52;\n  filter: drop-shadow(0 0 12px rgba(125,211,252,0.28));', 'brighten distant starfield');
replace('.lm-depth-grid { inset: 4% 2% 1%;', '.lm-depth-grid { inset: -2% -6% -4%;', 'expand depth grid into galaxy layer');
replace('opacity: 0.76; }\n.lm-horizon', 'opacity: 0.46; }\n.lm-galaxy-rift { inset: 8% -12% 12%; z-index: -5; border-radius: 50%; background: radial-gradient(ellipse at 50% 50%, rgba(125,211,252,0.14), transparent 31%), radial-gradient(ellipse at 50% 56%, transparent 0 42%, rgba(192,132,252,0.08) 43%, transparent 47%), conic-gradient(from 218deg at 50% 50%, transparent, rgba(103,232,249,0.10), transparent, rgba(216,180,254,0.10), transparent); filter: blur(5px) saturate(1.2); transform: rotateX(66deg); opacity: 0.72; animation: lmNebula 18s ease-in-out infinite alternate; }\n.lm-foreground-dust { inset: -8%; z-index: 12; background-image: radial-gradient(circle, rgba(255,255,255,0.18) 0 1px, transparent 1.4px); background-size: 88px 88px; opacity: 0.18; mix-blend-mode: screen; animation: lmStarDrift 12s ease-in-out infinite alternate; }\n.lm-horizon', 'add rift/dust CSS');
replace('.lm-horizon { left: -8%; right: -8%; bottom: 23%; height: 28%; z-index: -4; background: linear-gradient(180deg, transparent, rgba(125,211,252,0.10) 46%, rgba(2,6,23,0.56)); filter: blur(4px); }\n.lm-ground { left: -12%; right: -12%; bottom: -18%; height: 38%; z-index: -3; border-radius: 50% 50% 0 0; background: radial-gradient(ellipse at 50% 0%, rgba(125,211,252,0.20), transparent 40%), radial-gradient(ellipse at 42% 22%, rgba(132,204,22,0.15), transparent 36%), linear-gradient(180deg, rgba(9,25,43,0.88), rgba(2,6,23,0.94)); border-top: 1px solid rgba(186,230,253,0.15); box-shadow: inset 0 28px 90px rgba(125,211,252,0.06); }', '.lm-horizon, .lm-ground { display: none; }', 'hide legacy horizon/ground CSS');
replace('.lm-title-panel { top: clamp(0.9rem, 2.3vw, 1.8rem); left: clamp(0.9rem, 2.3vw, 1.8rem); width: min(24rem, calc(100vw - 1.8rem));', '.lm-title-panel { top: clamp(0.75rem, 1.9vw, 1.35rem); left: clamp(0.75rem, 1.9vw, 1.35rem); width: min(20rem, calc(100vw - 1.5rem));', 'reduce title panel dominance');
replace('font-size: clamp(2.7rem, 5.2vw, 5.4rem);', 'font-size: clamp(2.35rem, 4.3vw, 4.4rem);', 'make title more cinematic and less poster-like');
replace('.lm-memory-capsule { --capsule-color: #7dd3fc; --capsule-core: #38bdf8; width: min(29rem, calc(100vw - 2rem));', '.lm-memory-capsule { --capsule-color: #7dd3fc; --capsule-core: #38bdf8; width: min(31rem, calc(100vw - 2rem));', 'open selected memory capsule');
replace('background: linear-gradient(145deg, rgba(3,8,20,0.88), rgba(15,23,42,0.66));', 'background: radial-gradient(circle at 16% 22%, color-mix(in srgb, var(--capsule-color) 16%, transparent), transparent 42%), linear-gradient(145deg, rgba(3,8,20,0.9), rgba(15,23,42,0.58));', 'give memory capsule inner glow');
replace('border: 1px solid color-mix(in srgb, var(--node-aura) 56%, transparent);', 'border: 1px solid color-mix(in srgb, var(--node-aura) 68%, transparent);', 'sharpen memory star core rim');
replace('width: 4.8rem; height: 4.8rem;', 'width: 5.7rem; height: 5.7rem;', 'increase star aura scale');
replace('.lm-hud { top: clamp(0.9rem, 2.3vw, 1.8rem); right: clamp(0.9rem, 2.3vw, 1.8rem); width: min(21rem, calc(100vw - 1.8rem));', '.lm-hud { top: clamp(0.75rem, 1.9vw, 1.35rem); right: clamp(0.75rem, 1.9vw, 1.35rem); width: min(19rem, calc(100vw - 1.5rem));', 'make HUD less blocking');
replace('box-shadow: 0 18px 60px rgba(0,0,0,0.42);', 'box-shadow: 0 18px 60px rgba(0,0,0,0.42), 0 0 42px rgba(125,211,252,0.08);', 'make route dock feel like portals');

fs.writeFileSync(target, s);
JS

echo "Life Map galaxy upgrade patch applied to $TARGET"
echo "Backup created next to the patched file."
echo "Next: pnpm typecheck && pnpm build && pnpm dev:3001"

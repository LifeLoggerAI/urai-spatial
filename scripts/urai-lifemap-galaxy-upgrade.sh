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

cp "$TARGET" "$TARGET.bak.$(date +%Y%m%d%H%M%S)"
python3 - <<'PY'
from pathlib import Path
import os

p = Path(os.environ['TARGET'])
s = p.read_text()

# Remove Life Map's last visible Home World leftovers.
s = s.replace('      <div className="lm-horizon" aria-hidden="true" />\n      <div className="lm-ground" aria-hidden="true" />\n', '')
s = s.replace('      <div className="lm-depth-grid" aria-hidden="true" />\n', '      <div className="lm-depth-grid" aria-hidden="true" />\n      <div className="lm-galaxy-rift" aria-hidden="true" />\n      <div className="lm-foreground-dust" aria-hidden="true" />\n')

# Make the title feel like a world layer, not a flat dashboard panel.
s = s.replace('Step inside yourself. Click a memory star; the camera moves to it and opens the image/form inside.', 'You ascended from Home World. Every star is a memory, chapter, relationship, pattern, or future path you can enter.')
s = s.replace('The orb is reading the constellation. Choose a star and stay with it.', 'The orb is reading your private galaxy. Choose a star and the memory opens in-world.')
s = s.replace('${node.title} is open. The memory image is inside the star; Focus enters it, Replay embodies it.', '${node.title} is open. Focus enters the chamber; Replay lets the memory move again.')

# Strengthen spatial and visual language in CSS without introducing heavy dependencies.
s = s.replace('.lm-sky,\n.lm-nebula,\n.lm-depth-grid,\n.lm-horizon,\n.lm-ground {', '.lm-sky,\n.lm-nebula,\n.lm-depth-grid,\n.lm-galaxy-rift,\n.lm-foreground-dust,\n.lm-horizon,\n.lm-ground {')
s = s.replace('    linear-gradient(180deg, #071426 0%, #030712 52%, #01030a 100%);', '    radial-gradient(ellipse at 50% 52%, rgba(14, 165, 233, 0.18), transparent 34rem),\n    radial-gradient(ellipse at 48% 58%, rgba(147, 51, 234, 0.16), transparent 42rem),\n    linear-gradient(180deg, #061126 0%, #020714 52%, #01030a 100%);')
s = s.replace('opacity: 0.36;\n  filter: drop-shadow(0 0 10px rgba(125,211,252,0.22));', 'opacity: 0.52;\n  filter: drop-shadow(0 0 12px rgba(125,211,252,0.28));')
s = s.replace('.lm-depth-grid { inset: 4% 2% 1%;', '.lm-depth-grid { inset: -2% -6% -4%;')
s = s.replace('opacity: 0.76; }\n.lm-horizon', 'opacity: 0.46; }\n.lm-galaxy-rift { inset: 8% -12% 12%; z-index: -5; border-radius: 50%; background: radial-gradient(ellipse at 50% 50%, rgba(125,211,252,0.14), transparent 31%), radial-gradient(ellipse at 50% 56%, transparent 0 42%, rgba(192,132,252,0.08) 43%, transparent 47%), conic-gradient(from 218deg at 50% 50%, transparent, rgba(103,232,249,0.10), transparent, rgba(216,180,254,0.10), transparent); filter: blur(5px) saturate(1.2); transform: rotateX(66deg); opacity: 0.72; animation: lmNebula 18s ease-in-out infinite alternate; }\n.lm-foreground-dust { inset: -8%; z-index: 12; background-image: radial-gradient(circle, rgba(255,255,255,0.18) 0 1px, transparent 1.4px); background-size: 88px 88px; opacity: 0.18; mix-blend-mode: screen; animation: lmStarDrift 12s ease-in-out infinite alternate; }\n.lm-horizon')
s = s.replace('.lm-horizon { left: -8%; right: -8%; bottom: 23%; height: 28%; z-index: -4; background: linear-gradient(180deg, transparent, rgba(125,211,252,0.10) 46%, rgba(2,6,23,0.56)); filter: blur(4px); }\n.lm-ground { left: -12%; right: -12%; bottom: -18%; height: 38%; z-index: -3; border-radius: 50% 50% 0 0; background: radial-gradient(ellipse at 50% 0%, rgba(125,211,252,0.20), transparent 40%), radial-gradient(ellipse at 42% 22%, rgba(132,204,22,0.15), transparent 36%), linear-gradient(180deg, rgba(9,25,43,0.88), rgba(2,6,23,0.94)); border-top: 1px solid rgba(186,230,253,0.15); box-shadow: inset 0 28px 90px rgba(125,211,252,0.06); }', '.lm-horizon, .lm-ground { display: none; }')
s = s.replace('width: min(24rem, calc(100vw - 1.8rem));', 'width: min(21rem, calc(100vw - 1.8rem));')
s = s.replace('font-size: clamp(2.7rem, 5.2vw, 5.4rem);', 'font-size: clamp(2.55rem, 4.4vw, 4.65rem);')
s = s.replace('background: linear-gradient(145deg, rgba(5,12,28,0.78), rgba(15,23,42,0.42));', 'background: linear-gradient(145deg, rgba(2,6,23,0.66), rgba(15,23,42,0.28));')
s = s.replace('box-shadow: 0 30px 90px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.08);', 'box-shadow: 0 22px 70px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08);')

# Make stars feel more like living states.
s = s.replace('animation: lmStarDrift 7s ease-in-out infinite alternate;', 'animation: lmStarDrift 7s ease-in-out infinite alternate, lmStarPulse 4.6s ease-in-out infinite;')
s = s.replace('@keyframes lmOrb {', '@keyframes lmStarPulse { 0%, 100% { filter: saturate(1); } 50% { filter: saturate(1.35) brightness(1.08); } }\n@keyframes lmOrb {')

p.write_text(s)
PY

echo "Patched cinematic Life Map scene. Now run checks:"
echo "  pnpm typecheck"
echo "  pnpm lint"
echo "  pnpm build"
echo "  pnpm dev:3001"
echo "Then open http://localhost:3001/life-map"

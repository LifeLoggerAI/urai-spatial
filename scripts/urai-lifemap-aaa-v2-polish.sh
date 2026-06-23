#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(pwd)}"
CSS="$ROOT/urai-tier1/src/app/life-map/life-map-aaa-universe.css"
TSX="$ROOT/urai-tier1/src/app/life-map/LifeMapAaaUniverse.tsx"

if [[ ! -f "$CSS" ]]; then
  echo "Missing $CSS" >&2
  exit 1
fi
if [[ ! -f "$TSX" ]]; then
  echo "Missing $TSX" >&2
  exit 1
fi

cp "$CSS" "$CSS.bak-v2-$(date +%Y%m%d%H%M%S)"
cp "$TSX" "$TSX.bak-v2-$(date +%Y%m%d%H%M%S)"

node <<'NODE'
const fs = require('fs');
const root = process.cwd();
const cssPath = `${root}/urai-tier1/src/app/life-map/life-map-aaa-universe.css`;
const tsxPath = `${root}/urai-tier1/src/app/life-map/LifeMapAaaUniverse.tsx`;

let tsx = fs.readFileSync(tsxPath, 'utf8');
tsx = tsx
  .replace('Click a memory star. The camera bends toward it. The memory opens in-world.', 'Ascended layer active. Choose a star to enter the living memory galaxy.')
  .replace('A replay window opened above the horizon.', 'A replay window opened inside the constellation.')
  .replace('The Home World became the entry point.', 'The Home World stayed below as the sky opened.')
  .replace('Identity reflected without leaving the world.', 'The mirror thread reflected from deep orbit.')
  .replace('Choose Focus or Replay to enter the memory.', 'Focus opens the chamber. Replay lets the memory move.');
fs.writeFileSync(tsxPath, tsx);

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* URAI LIFE MAP AAA V2 POLISH */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.urai-life-map-aaa{\n  background:\n    radial-gradient(circle at var(--selected-x) var(--selected-y),hsla(var(--selected-hue),88%,68%,.22),transparent 15rem),\n    radial-gradient(ellipse at 28% 18%,rgba(86,224,255,.14),transparent 34rem),\n    radial-gradient(ellipse at 76% 23%,rgba(190,116,255,.16),transparent 35rem),\n    radial-gradient(ellipse at 50% 58%,rgba(118,244,255,.07),transparent 44rem),\n    linear-gradient(180deg,#10183d 0%,#071329 45%,#030814 74%,#01030a 100%)!important;\n}\n.urai-life-map-aaa::before,\n.urai-life-map-aaa::after{\n  content:\"\";\n  position:absolute;\n  inset:-12%;\n  z-index:1;\n  pointer-events:none;\n  background-image:\n    radial-gradient(circle at 8% 18%,rgba(255,255,255,.54) 0 1px,transparent 1.8px),\n    radial-gradient(circle at 21% 71%,rgba(144,232,255,.38) 0 1px,transparent 1.8px),\n    radial-gradient(circle at 34% 29%,rgba(255,255,255,.44) 0 1px,transparent 1.8px),\n    radial-gradient(circle at 49% 82%,rgba(255,255,255,.30) 0 1px,transparent 1.8px),\n    radial-gradient(circle at 64% 13%,rgba(144,232,255,.42) 0 1px,transparent 1.8px),\n    radial-gradient(circle at 79% 66%,rgba(255,255,255,.34) 0 1px,transparent 1.8px),\n    radial-gradient(circle at 92% 26%,rgba(220,190,255,.38) 0 1px,transparent 1.8px);\n  opacity:.56;\n  transform:translate3d(calc(var(--camera-x)*-.18),calc(var(--camera-y)*-.14),0) scale(1.1);\n}\n.urai-life-map-aaa::after{\n  opacity:.22;\n  filter:blur(1.2px);\n  transform:translate3d(calc(var(--camera-x)*-.42),calc(var(--camera-y)*-.35),0) scale(1.42);\n}\n.urai-life-map-aaa__horizon-bloom,\n.urai-life-map-aaa__horizon-gates,\n.urai-life-map-aaa__terrain,\n.urai-life-map-aaa__terrain-grid{\n  display:none!important;\n}\n.urai-life-map-aaa__orbit{\n  left:13vw!important;\n  right:13vw!important;\n  bottom:auto!important;\n  top:31vh!important;\n  height:30vh!important;\n  opacity:.26!important;\n  border-color:rgba(188,247,255,.16)!important;\n  box-shadow:0 0 72px rgba(103,232,249,.08)!important;\n  transform:rotateX(62deg) scaleX(1.06)!important;\n  mask-image:radial-gradient(ellipse at center,black 0 64%,transparent 78%);\n}\n.urai-life-map-aaa__orbit--far{top:23vh!important;transform:rotateX(68deg) scaleX(1.34)!important;opacity:.16!important}\n.urai-life-map-aaa__orbit--mid{top:33vh!important;transform:rotateX(61deg) scaleX(1.02)!important;opacity:.30!important}\n.urai-life-map-aaa__orbit--near{top:43vh!important;transform:rotateX(56deg) scaleX(.74)!important;opacity:.38!important}\n.urai-life-map-aaa__memory-dust{\n  opacity:.74!important;\n  background:\n    radial-gradient(circle at 9% 77%,rgba(255,255,255,.24) 0 1px,transparent 2px),\n    radial-gradient(circle at 22% 48%,rgba(142,235,255,.24) 0 1px,transparent 2px),\n    radial-gradient(circle at 39% 70%,rgba(255,255,255,.18) 0 1px,transparent 2px),\n    radial-gradient(circle at 59% 18%,rgba(142,235,255,.20) 0 1px,transparent 2px),\n    radial-gradient(circle at 83% 60%,rgba(255,255,255,.22) 0 1px,transparent 2px),\n    radial-gradient(circle at 94% 84%,rgba(217,184,255,.20) 0 1px,transparent 2px)!important;\n}\n.urai-life-map-aaa__title{\n  width:min(270px,calc(100vw - 36px))!important;\n  padding:13px 15px!important;\n  border-radius:20px!important;\n  background:linear-gradient(145deg,rgba(3,12,28,.56),rgba(12,27,49,.20))!important;\n  box-shadow:0 18px 58px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.07)!important;\n}\n.urai-life-map-aaa__title h1{\n  font-size:clamp(2.05rem,3.4vw,3.7rem)!important;\n  line-height:.88!important;\n  letter-spacing:-.075em!important;\n}\n.urai-life-map-aaa__title span{\n  max-width:220px!important;\n  font-size:.74rem!important;\n  line-height:1.34!important;\n}\n.urai-life-map-aaa__support{\n  display:none!important;\n}\n.urai-life-map-aaa__portal{\n  grid-template-columns:104px minmax(158px,218px)!important;\n  gap:12px!important;\n  min-height:132px!important;\n  max-width:min(382px,50vw)!important;\n  padding:12px!important;\n  border-radius:26px!important;\n  background:\n    radial-gradient(circle at 24% 34%,hsla(var(--hue),95%,70%,.24),transparent 34%),\n    linear-gradient(145deg,rgba(3,11,26,.64),rgba(18,33,58,.28))!important;\n  box-shadow:0 30px 95px rgba(0,0,0,.42),0 0 95px hsla(var(--hue),95%,66%,.22),inset 0 1px 0 rgba(255,255,255,.12)!important;\n  backdrop-filter:blur(18px) saturate(1.18)!important;\n}\n.urai-life-map-aaa__portal-image{\n  width:104px!important;\n  height:104px!important;\n  min-height:104px!important;\n  border-radius:22px!important;\n}\n.urai-life-map-aaa__portal-copy small{font-size:.56rem!important;letter-spacing:.13em!important}\n.urai-life-map-aaa__portal-copy strong{font-size:clamp(1.28rem,2vw,1.78rem)!important;line-height:.9!important}\n.urai-life-map-aaa__portal-copy em{font-size:.74rem!important;line-height:1.28!important}\n.urai-life-map-aaa__portal-copy span{min-height:2.15rem!important;padding:0 .72rem!important;font-size:.72rem!important}\n.urai-life-map-aaa__orb{\n  transform:scale(.86)!important;\n  transform-origin:center!important;\n  max-width:300px!important;\n  opacity:.92!important;\n}\n.urai-life-map-aaa__readout{\n  right:clamp(18px,2vw,34px)!important;\n  bottom:clamp(86px,12vh,132px)!important;\n  transform:scale(.88)!important;\n  transform-origin:bottom right!important;\n  opacity:.72!important;\n}\n.urai-life-map-aaa__rail{\n  bottom:clamp(14px,3vh,24px)!important;\n  background:rgba(2,8,22,.58)!important;\n}\n.urai-life-map-aaa__star{\n  filter:drop-shadow(0 0 20px hsla(var(--hue),95%,66%,.28));\n}\n.urai-life-map-aaa__star[data-selected=true] .urai-life-map-aaa__star-label{\n  opacity:.18!important;\n}\n@media(max-width:900px){\n  .urai-life-map-aaa__portal{max-width:min(360px,72vw)!important;grid-template-columns:86px minmax(130px,1fr)!important}\n  .urai-life-map-aaa__portal-image{width:86px!important;height:86px!important;min-height:86px!important}\n  .urai-life-map-aaa__readout{display:none!important}\n}\n@media(max-width:640px){\n  .urai-life-map-aaa__title{width:calc(100vw - 28px)!important;max-width:320px!important}\n  .urai-life-map-aaa__portal{left:50%!important;top:auto!important;bottom:92px!important;grid-template-columns:72px 1fr!important;max-width:calc(100vw - 24px)!important;transform:translateX(-50%)!important}\n  .urai-life-map-aaa__portal-image{width:72px!important;height:72px!important;min-height:72px!important}\n}\n`;
}
fs.writeFileSync(cssPath, css);
console.log('patched: LifeMapAaaUniverse actual route CSS/TSX v2 polish');
NODE

echo "Life Map AAA v2 polish applied."
echo "Next: pnpm typecheck && pnpm build && pnpm dev:3001"

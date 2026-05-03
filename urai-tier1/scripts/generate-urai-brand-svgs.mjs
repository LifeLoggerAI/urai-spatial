import fs from "node:fs";
import path from "node:path";

const registryTs = fs.readFileSync("src/brand/urai-brand.registry.ts", "utf8");
const outDir = "brand/exports/svg";
fs.mkdirSync(outDir, { recursive: true });

const productBlocks = [...registryTs.matchAll(/(\w+):\s*{\s*key:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?accent:\s*"([^"]+)"[\s\S]*?symbolModifier:\s*"([^"]+)"/g)]
  .map((m) => ({ key: m[2], name: m[3], accent: m[4], modifier: m[5] }));

if (productBlocks.length < 13) throw new Error(`Expected at least 13 products, found ${productBlocks.length}`);

const DARK = "#0B0F1A";
const LIGHT = "#FFFFFF";

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

function modifierSvg(modifier, accent) {
  switch (modifier) {
    case "precision-line-scan": return `<g data-modifier="${modifier}"><line x1="28" y1="72" x2="72" y2="28" stroke="${accent}" stroke-width="2"/><line x1="36" y1="78" x2="78" y2="36" stroke="${accent}" stroke-width="1" opacity="0.5"/></g>`;
    case "soft-human-halo": return `<g data-modifier="${modifier}"><circle cx="50" cy="50" r="24" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.45"/><circle cx="50" cy="50" r="30" fill="none" stroke="${accent}" stroke-width="1" opacity="0.25"/></g>`;
    case "creative-wave": return `<path data-modifier="${modifier}" d="M24 52 C36 38,46 66,58 50 S76 42,82 54" fill="none" stroke="${accent}" stroke-width="2" opacity="0.75"/>`;
    case "modular-block-assembly": return `<g data-modifier="${modifier}" fill="${accent}" opacity="0.75"><rect x="30" y="30" width="6" height="6" rx="1"/><rect x="64" y="30" width="6" height="6" rx="1"/><rect x="30" y="64" width="6" height="6" rx="1"/><rect x="64" y="64" width="6" height="6" rx="1"/></g>`;
    case "data-lattice-pulse": return `<g data-modifier="${modifier}" fill="${accent}" opacity="0.7">${[38,50,62].flatMap(x => [38,50,62].map(y => `<circle cx="${x}" cy="${y}" r="1.8"/>`)).join("")}</g>`;
    case "layer-stack-shift": return `<g data-modifier="${modifier}" stroke="${accent}" stroke-width="1.6" opacity="0.75"><line x1="34" y1="38" x2="66" y2="38"/><line x1="30" y1="50" x2="70" y2="50"/><line x1="34" y1="62" x2="66" y2="62"/></g>`;
    case "node-message-transfer": return `<g data-modifier="${modifier}" stroke="${accent}" fill="${accent}" opacity="0.75"><line x1="32" y1="50" x2="68" y2="50" stroke-width="1.4"/><circle cx="32" cy="50" r="3"/><circle cx="68" cy="50" r="3"/><circle cx="50" cy="32" r="2.5"/></g>`;
    case "broadcast-expansion": return `<g data-modifier="${modifier}" fill="none" stroke="${accent}" opacity="0.65"><path d="M58 42 A12 12 0 0 1 58 58" stroke-width="1.5"/><path d="M64 36 A20 20 0 0 1 64 64" stroke-width="1.3"/><path d="M70 30 A28 28 0 0 1 70 70" stroke-width="1"/></g>`;
    case "route-path-flow": return `<path data-modifier="${modifier}" d="M26 66 C38 48,48 74,62 48 C68 38,72 34,78 30" fill="none" stroke="${accent}" stroke-width="2" opacity="0.75"/>`;
    case "protective-boundary": return `<path data-modifier="${modifier}" d="M50 28 L68 36 V50 C68 62,60 70,50 74 C40 70,32 62,32 50 V36 Z" fill="none" stroke="${accent}" stroke-width="1.8" opacity="0.75"/>`;
    case "stable-frame-breathe": return `<rect data-modifier="${modifier}" x="28" y="28" width="44" height="44" rx="8" fill="none" stroke="${accent}" stroke-width="1.6" opacity="0.7"/>`;
    case "depth-field-parallax": return `<g data-modifier="${modifier}" fill="none" stroke="${accent}" opacity="0.75"><ellipse cx="50" cy="50" rx="30" ry="14" stroke-width="1.5"/><ellipse cx="50" cy="50" rx="20" ry="8" stroke-width="1" opacity="0.5"/></g>`;
    case "clean-pulse": return "";
    default: throw new Error(`Unknown modifier: ${modifier}`);
  }
}

function buildSvg(product, mode) {
  const ring = mode === "dark" ? LIGHT : DARK;
  const text = mode === "dark" ? LIGHT : DARK;
  const label = product.name.replace(/^URAI ?/, "") || "CORE";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="640" viewBox="0 0 100 125" role="img" aria-labelledby="title desc" data-urai-product="${product.key}" data-mode="${mode}">
<title id="title">${esc(product.name)}</title>
<desc id="desc">URAI master symbol system logo variant for ${esc(product.name)}</desc>
${mode === "dark" ? `<rect width="100" height="125" rx="10" fill="${DARK}"/>` : ""}
<circle cx="50" cy="50" r="36" fill="none" stroke="${ring}" stroke-width="2"/>
<circle cx="50" cy="50" r="8" fill="${product.accent}"/>
${modifierSvg(product.modifier, product.accent)}
<text x="50" y="105" text-anchor="middle" font-family="Inter, Sora, Arial, sans-serif" font-size="8" font-weight="700" letter-spacing="1.6" fill="${text}">URAI</text>
<text x="50" y="116" text-anchor="middle" font-family="Inter, Sora, Arial, sans-serif" font-size="4.2" font-weight="500" letter-spacing="0.9" fill="${text}" opacity="0.72">${esc(label)}</text>
</svg>
`;
}

let count = 0;
for (const product of productBlocks) {
  for (const mode of ["light", "dark"]) {
    fs.writeFileSync(path.join(outDir, `${product.key}.${mode}.svg`), buildSvg(product, mode));
    count++;
  }
}

console.log(`[OK] Generated ${count} SVG exports in ${outDir}`);

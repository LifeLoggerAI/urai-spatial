import fs from "node:fs";
import path from "node:path";

const svgDir = "brand/exports/svg";
const registryTs = fs.readFileSync("src/brand/urai-brand.registry.ts", "utf8");
const keys = [...registryTs.matchAll(/key:\s*"([^"]+)"/g)].map(m => m[1]);
let failures = [];

for (const key of keys) {
  for (const mode of ["light", "dark"]) {
    const file = path.join(svgDir, `${key}.${mode}.svg`);
    if (!fs.existsSync(file)) {
      failures.push(`${key}.${mode}: missing SVG`);
      continue;
    }
    const svg = fs.readFileSync(file, "utf8");
    if (!svg.includes('viewBox="0 0 100 125"')) failures.push(`${key}.${mode}: bad viewBox`);
    if (!svg.includes(`data-urai-product="${key}"`)) failures.push(`${key}.${mode}: missing product attr`);
    if (!svg.includes(`data-mode="${mode}"`)) failures.push(`${key}.${mode}: missing mode attr`);
    if (!svg.includes('<circle cx="50" cy="50" r="36"')) failures.push(`${key}.${mode}: missing outer ring`);
    if (!svg.includes('<circle cx="50" cy="50" r="8"')) failures.push(`${key}.${mode}: missing core node`);
    if (!svg.includes("<title")) failures.push(`${key}.${mode}: missing title`);
    if (!svg.includes("<desc")) failures.push(`${key}.${mode}: missing desc`);
  }
}

const actual = fs.existsSync(svgDir) ? fs.readdirSync(svgDir).filter(f => f.endsWith(".svg")).length : 0;
const expected = keys.length * 2;
if (actual < expected) failures.push(`export count low: expected ${expected}, found ${actual}`);

if (failures.length) {
  console.error("[FAIL] URAI brand SVG QA failed:");
  failures.forEach(f => console.error(" - " + f));
  process.exit(1);
}

console.log(`[PASS] URAI brand SVG QA passed (${actual} SVG files checked)`);

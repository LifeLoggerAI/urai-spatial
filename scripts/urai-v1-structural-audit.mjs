#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const root = process.cwd();
const base = process.env.BASE_URL || "https://urai.app";
const loopName = process.env.LOOP_NAME || "urai-v1-autopilot";
const outputDir = path.join(root, "docs", "receipts", "visual-verdicts");
fs.mkdirSync(outputDir, { recursive: true });

const targets = [
  {
    name: "ground",
    path: "/ground",
    root: ".uraiAutoGround",
    checks: [
      ["six physical stations", ".uraiGroundObject", 6],
      ["five embodied helpers", ".uraiGroundHelper", 5],
      ["room architecture", ".uraiGroundArchitecture", 1],
      ["mobile inspection sheet", ".uraiGroundMobileSheet", 1],
    ],
  },
  {
    name: "focus",
    path: "/focus?memoryId=quiet-reset",
    root: ".uraiAutoFocus",
    checks: [
      ["dominant selected memory", ".uraiFocusMemory", 1],
      ["memory image", ".uraiFocusMemoryImage", 1],
      ["Replay entry", ".uraiFocusMemory[href*='/replay']", 1],
      ["chamber depth rings", ".uraiFocusMemoryRings i", 3],
    ],
  },
  {
    name: "replay",
    path: "/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread",
    root: ".uraiAutoReplay",
    checks: [
      ["cinematic scene planes", ".uraiReplayScene", 4],
      ["emotional beats", ".uraiReplayBeats li", 4],
      ["film caption", ".uraiReplayCaption", 1],
      ["film controls", ".uraiReplayControls", 1],
    ],
  },
];

const viewports = [
  { name: "desktop", width: 1440, height: 960, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

const browser = await chromium.launch({ headless: true });
const results = [];
const issues = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });

    for (const target of targets) {
      const page = await context.newPage();
      const separator = target.path.includes("?") ? "&" : "?";
      const url = `${base}${target.path}${separator}structural=${Date.now()}`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(1200);

      const routeResult = {
        route: target.name,
        viewport: viewport.name,
        url,
        status: response?.status() || 0,
        checks: [],
        layout: null,
      };

      if (!response || response.status() >= 400) {
        issues.push(`${target.name}/${viewport.name}: HTTP ${response?.status() || 0}`);
      }

      const rootLocator = page.locator(target.root);
      const rootCount = await rootLocator.count();
      const rootVisible = rootCount > 0 && await rootLocator.first().isVisible().catch(() => false);
      routeResult.checks.push({ name: "immersive replacement root", expected: 1, actual: rootCount, visible: rootVisible });
      if (rootCount !== 1 || !rootVisible) {
        issues.push(`${target.name}/${viewport.name}: immersive replacement root missing or hidden`);
      }

      for (const [label, selector, expected] of target.checks) {
        const actual = await page.locator(selector).count();
        routeResult.checks.push({ name: label, expected, actual });
        if (actual < expected) {
          issues.push(`${target.name}/${viewport.name}: ${label} expected ${expected}, got ${actual}`);
        }
      }

      const layout = await page.evaluate((selector) => {
        const root = document.querySelector(selector);
        const rect = root?.getBoundingClientRect();
        const doc = document.documentElement;
        const body = document.body;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const horizontalOverflow = Math.max(doc.scrollWidth, body.scrollWidth) - viewportWidth;
        const verticalOverflow = Math.max(doc.scrollHeight, body.scrollHeight) - viewportHeight;
        return {
          viewportWidth,
          viewportHeight,
          horizontalOverflow,
          verticalOverflow,
          rootRect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
        };
      }, target.root);
      routeResult.layout = layout;

      if (layout.horizontalOverflow > 3) {
        issues.push(`${target.name}/${viewport.name}: horizontal overflow ${layout.horizontalOverflow}px`);
      }
      if (!layout.rootRect || layout.rootRect.width < viewport.width * 0.98 || layout.rootRect.height < viewport.height * 0.98) {
        issues.push(`${target.name}/${viewport.name}: replacement root does not cover viewport`);
      }

      if (target.name === "ground") {
        const cardLikeVisible = await page.locator(".uraiAutoGround .heroCard,.uraiAutoGround .rightCard,.uraiAutoGround .station").count();
        routeResult.checks.push({ name: "legacy card surfaces absent", expected: 0, actual: cardLikeVisible });
        if (cardLikeVisible !== 0) issues.push(`${target.name}/${viewport.name}: legacy card surfaces visible in replacement layer`);
      }

      if (viewport.name === "mobile") {
        const mobileSafety = await page.evaluate(() => {
          const controls = Array.from(document.querySelectorAll(".uraiAutoWorld a,.uraiAutoWorld button"));
          const bad = controls
            .map((el) => ({ text: (el.textContent || "").trim().slice(0, 60), rect: el.getBoundingClientRect() }))
            .filter(({ rect }) => rect.width > 0 && rect.height > 0)
            .filter(({ rect }) => rect.left < -2 || rect.right > window.innerWidth + 2 || rect.top < -2 || rect.bottom > window.innerHeight + 2)
            .map(({ text, rect }) => ({ text, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }));
          return { bad };
        });
        routeResult.mobileSafety = mobileSafety;
        if (mobileSafety.bad.length) {
          issues.push(`${target.name}/mobile: ${mobileSafety.bad.length} visible controls clipped outside viewport`);
        }
      }

      results.push(routeResult);
      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

const verdict = issues.length ? "MACHINE_FAIL" : "MACHINE_PASS";
const report = {
  generatedAt: new Date().toISOString(),
  loopName,
  base,
  verdict,
  issues,
  results,
  note: "This gate verifies route-specific immersive structure and viewport safety. Final artistic taste still requires visual review.",
};

const jsonPath = path.join(outputDir, `${loopName}-structural-audit.json`);
const mdPath = path.join(outputDir, `${loopName}-structural-audit.md`);
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

const lines = [
  `# V1 structural audit — ${loopName}`,
  "",
  `VERDICT: ${verdict}`,
  "",
  `- Base: ${base}`,
  `- Routes: ${targets.length}`,
  `- Viewports: ${viewports.length}`,
  "",
  "## Issues",
  ...(issues.length ? issues.map((issue) => `- ${issue}`) : ["- None"]),
  "",
  "## Boundary",
  "- This verifies immersive route structure, object/helper counts, viewport coverage, overflow, clipped controls, and navigation affordances.",
  "- It does not independently certify AAA artistic taste.",
  "",
];
fs.writeFileSync(mdPath, lines.join("\n"));

console.log(`VERDICT: ${verdict}`);
console.log(`STRUCTURAL_REPORT_JSON=${jsonPath}`);
console.log(`STRUCTURAL_REPORT_MD=${mdPath}`);
if (issues.length) {
  console.log("ISSUES:");
  for (const issue of issues) console.log(`- ${issue}`);
}
process.exit(issues.length ? 4 : 0);

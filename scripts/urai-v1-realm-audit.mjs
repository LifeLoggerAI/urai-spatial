#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'https://urai.app';
const loopName = process.env.LOOP_NAME || 'v1-realms';
const outputDir = path.join(process.cwd(), 'docs', 'receipts', 'visual-verdicts');
fs.mkdirSync(outputDir, { recursive: true });

const targets = [
  { name: 'mirror', route: '/mirror', root: '.uraiAutoMirror', desktop: 'mirror-reflection-main.webp', mobile: 'mirror-reflection-mobile.webp' },
  { name: 'passport', route: '/passport', root: '.uraiAutoPassport', desktop: 'passport-vault-main.webp', mobile: 'passport-vault-mobile.webp' },
  { name: 'privacy', route: '/privacy-controls', root: '.uraiAutoPrivacy', desktop: 'privacy-controls-main.webp', mobile: 'privacy-controls-mobile.webp' },
  { name: 'location', route: '/location-map', root: '.uraiAutoLocation', desktop: 'location-emotional-weather-main.webp', mobile: 'location-emotional-weather-mobile.webp' },
  { name: 'status', route: '/status', root: '.uraiAutoStatus', desktop: 'status-route-matrix-main.webp', mobile: 'status-route-matrix-mobile.webp' },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 960, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

const issues = [];
const results = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });

    for (const target of targets) {
      const page = await context.newPage();
      const response = await page.goto(`${base}${target.route}?realmAudit=${Date.now()}`, {
        waitUntil: 'domcontentloaded',
        timeout: 90_000,
      });
      await page.waitForTimeout(1200);

      const result = {
        route: target.name,
        viewport: viewport.name,
        status: response?.status() || 0,
        checks: {},
      };

      if (!response || response.status() >= 400) {
        issues.push(`${target.name}/${viewport.name}: HTTP ${response?.status() || 0}`);
      }

      const root = page.locator(target.root);
      const rootCount = await root.count();
      const rootVisible = rootCount === 1 && await root.isVisible().catch(() => false);
      result.checks.rootCount = rootCount;
      result.checks.rootVisible = rootVisible;
      if (!rootVisible) issues.push(`${target.name}/${viewport.name}: autonomous realm root missing or hidden`);

      const signalCount = await page.locator(`${target.root} .uraiRealmSignals li`).count();
      const navigationCount = await page.locator(`${target.root} .uraiRealmNavigation a`).count();
      const accentCount = await page.locator(`${target.root} .uraiRealmAccent`).count();
      result.checks.signalCount = signalCount;
      result.checks.navigationCount = navigationCount;
      result.checks.accentCount = accentCount;
      if (signalCount < 3) issues.push(`${target.name}/${viewport.name}: expected 3 active signals, got ${signalCount}`);
      if (navigationCount < 2) issues.push(`${target.name}/${viewport.name}: expected 2 navigation actions, got ${navigationCount}`);
      if (accentCount < 1) issues.push(`${target.name}/${viewport.name}: expected at least 1 realm accent`);

      const expectedAsset = viewport.name === 'mobile' ? target.mobile : target.desktop;
      const scene = await page.evaluate(({ selector, expected }) => {
        const image = document.querySelector(`${selector} .uraiRealmSceneArt img`);
        const rootElement = document.querySelector(selector);
        const rootRect = rootElement?.getBoundingClientRect();
        const controls = Array.from(document.querySelectorAll(`${selector} a,${selector} button`));
        const clippedControls = controls
          .map((element) => ({ text: (element.textContent || '').trim(), rect: element.getBoundingClientRect() }))
          .filter(({ rect }) => rect.width > 0 && rect.height > 0)
          .filter(({ rect }) => rect.left < -2 || rect.right > window.innerWidth + 2 || rect.top < -2 || rect.bottom > window.innerHeight + 2)
          .map(({ text, rect }) => ({ text, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }));
        return {
          currentSrc: image instanceof HTMLImageElement ? image.currentSrc : '',
          expected,
          rootRect: rootRect ? { width: rootRect.width, height: rootRect.height, left: rootRect.left, top: rootRect.top } : null,
          clippedControls,
          horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        };
      }, { selector: target.root, expected: expectedAsset });
      result.scene = scene;

      if (!scene.currentSrc.includes(expectedAsset)) {
        issues.push(`${target.name}/${viewport.name}: expected scene asset ${expectedAsset}, got ${scene.currentSrc || 'none'}`);
      }
      if (!scene.rootRect || scene.rootRect.width < viewport.width * 0.98 || scene.rootRect.height < viewport.height * 0.98) {
        issues.push(`${target.name}/${viewport.name}: realm does not cover viewport`);
      }
      if (scene.clippedControls.length) {
        issues.push(`${target.name}/${viewport.name}: ${scene.clippedControls.length} visible controls clipped`);
      }
      if (scene.horizontalOverflow > 12 && scene.clippedControls.length) {
        issues.push(`${target.name}/${viewport.name}: actionable horizontal overflow ${scene.horizontalOverflow}px`);
      }

      results.push(result);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const verdict = issues.length ? 'MACHINE_FAIL' : 'MACHINE_PASS';
const report = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  loopName,
  base,
  verdict,
  issues,
  results,
  boundary: 'Verifies generated scene ownership, required realm structure, viewport coverage, and actionable control safety. Final artistic taste remains a human gate.',
};

const jsonPath = path.join(outputDir, `${loopName}-realm-audit.json`);
const mdPath = path.join(outputDir, `${loopName}-realm-audit.md`);
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(mdPath, [
  `# V1 realm audit — ${loopName}`,
  '',
  `VERDICT: ${verdict}`,
  '',
  '## Issues',
  ...(issues.length ? issues.map((issue) => `- ${issue}`) : ['- None']),
  '',
  '## Boundary',
  `- ${report.boundary}`,
  '',
].join('\n'));

console.log(`VERDICT: ${verdict}`);
console.log(`REALM_REPORT_JSON=${jsonPath}`);
console.log(`REALM_REPORT_MD=${mdPath}`);
for (const issue of issues) console.log(`- ${issue}`);
process.exit(issues.length ? 4 : 0);

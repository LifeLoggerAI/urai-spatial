#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const baseUrl = String(process.env.URAI_BASE_URL || process.argv[2] || 'https://urai.app').replace(/\/$/, '');
const outputPath = path.resolve(process.env.URAI_ACCESSIBILITY_EVIDENCE || 'release-evidence/accessibility.json');
const routes = [
  '/',
  '/ground',
  '/life-map',
  '/focus?memoryId=quiet-reset',
  '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread',
  '/mirror',
  '/passport',
  '/privacy-controls',
  '/status',
];
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 }, isMobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
];

const report = {
  schemaVersion: 'urai-live-accessibility-evidence-1',
  generatedAt: new Date().toISOString(),
  baseUrl,
  routes: [],
  summary: { checks: 0, failures: 0 },
  scope: [
    'HTTP navigation',
    'document language and title',
    'main landmark and H1 presence',
    'accessible names for visible interactive controls',
    'image alternative text',
    'keyboard focus entry',
    'mobile horizontal overflow',
    'reduced-motion media preference activation',
  ],
  caveat: 'Automated semantic, keyboard-entry, viewport, and reduced-motion gate. Manual assistive-technology testing remains a separate release responsibility.',
};

const browser = await chromium.launch({ headless: true });
try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: profile.viewport,
      isMobile: profile.isMobile,
      reducedMotion: 'reduce',
    });

    for (const route of routes) {
      const page = await context.newPage();
      const failures = [];
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => consoleErrors.push(String(error?.message || error)));

      const url = `${baseUrl}${route}`;
      let responseStatus = 0;
      try {
        const response = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        responseStatus = response?.status() || 0;
        if (!response?.ok()) throw new Error(`HTTP status ${responseStatus}`);

        const result = await page.evaluate(() => {
          const accessibleName = (element) => {
            const ariaLabel = element.getAttribute('aria-label')?.trim();
            if (ariaLabel) return ariaLabel;
            const labelledBy = element.getAttribute('aria-labelledby');
            if (labelledBy) {
              const value = labelledBy
                .split(/\s+/)
                .map((id) => document.getElementById(id)?.textContent?.trim() || '')
                .filter(Boolean)
                .join(' ');
              if (value) return value;
            }
            if ('labels' in element && element.labels?.length) {
              const value = Array.from(element.labels)
                .map((label) => label.textContent?.trim() || '')
                .filter(Boolean)
                .join(' ');
              if (value) return value;
            }
            return (
              element.getAttribute('title')?.trim() ||
              element.getAttribute('alt')?.trim() ||
              (element.tagName === 'INPUT' ? element.value?.trim() : '') ||
              element.textContent?.trim() ||
              ''
            );
          };

          const interactiveSelector = [
            'a[href]',
            'button',
            'input:not([type="hidden"])',
            'select',
            'textarea',
            '[role="button"]',
            '[role="link"]',
            '[tabindex]:not([tabindex="-1"])',
          ].join(',');
          const interactive = Array.from(document.querySelectorAll(interactiveSelector));
          const visibleInteractive = interactive
            .filter((element) => !element.hasAttribute('disabled'))
            .filter((element) => element.getAttribute('aria-hidden') !== 'true')
            .filter((element) => element.offsetWidth > 0 || element.offsetHeight > 0);
          const unnamedInteractive = visibleInteractive
            .filter((element) => accessibleName(element).length === 0)
            .map((element) => ({
              tag: element.tagName.toLowerCase(),
              id: element.id || null,
              className: typeof element.className === 'string' ? element.className.slice(0, 160) : null,
            }));
          const imagesWithoutAlt = Array.from(document.querySelectorAll('img'))
            .filter((image) => image.getAttribute('role') !== 'presentation')
            .filter((image) => image.getAttribute('aria-hidden') !== 'true')
            .filter((image) => image.offsetWidth > 0 || image.offsetHeight > 0)
            .filter((image) => !image.hasAttribute('alt'))
            .map((image) => image.getAttribute('src') || 'unknown');

          return {
            lang: document.documentElement.lang,
            title: document.title,
            mainCount: document.querySelectorAll('main').length,
            h1Count: document.querySelectorAll('h1').length,
            interactiveCount: visibleInteractive.length,
            unnamedInteractive,
            imagesWithoutAlt,
            horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            reducedMotionMatches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          };
        });

        if (!result.lang) failures.push('Missing html lang attribute');
        if (!result.title) failures.push('Missing document title');
        if (result.mainCount < 1) failures.push('Missing main landmark');
        if (result.h1Count < 1) failures.push('Missing H1');
        if (result.unnamedInteractive.length > 0) {
          failures.push(`${result.unnamedInteractive.length} visible interactive controls have no accessible name`);
        }
        if (result.imagesWithoutAlt.length > 0) {
          failures.push(`${result.imagesWithoutAlt.length} visible images are missing alt attributes`);
        }
        if (profile.isMobile && result.horizontalOverflow > 2) {
          failures.push(`Mobile horizontal overflow: ${result.horizontalOverflow}px`);
        }
        if (!result.reducedMotionMatches) failures.push('Reduced-motion preference was not activated');

        if (result.interactiveCount > 0) {
          await page.keyboard.press('Tab');
          const focusEntered = await page.evaluate(() => {
            const active = document.activeElement;
            return Boolean(active && active !== document.body && active !== document.documentElement);
          });
          if (!focusEntered) failures.push('Tab key did not move focus into the page');
        }

        report.routes.push({
          route,
          profile: profile.name,
          url,
          responseStatus,
          result,
          consoleErrors,
          failures,
          passed: failures.length === 0,
        });
      } catch (error) {
        failures.push(String(error?.message || error));
        report.routes.push({ route, profile: profile.name, url, responseStatus, consoleErrors, failures, passed: false });
      } finally {
        report.summary.checks += 1;
        report.summary.failures += failures.length;
        await page.close();
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`ACCESSIBILITY_EVIDENCE=${outputPath}`);
console.log(`ACCESSIBILITY_CHECKS=${report.summary.checks}`);
console.log(`ACCESSIBILITY_FAILURES=${report.summary.failures}`);

if (report.summary.failures > 0) process.exit(1);

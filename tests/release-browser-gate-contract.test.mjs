import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const src=readFileSync(new URL('./spatial-tier-lock-hardening.mjs',import.meta.url),'utf8');
test('release invokes true browser journey, not only static route check',()=>{
 const cmd=pkg.scripts['test:e2e'];
 assert.match(cmd,/playwright:ensure/);
 assert.match(cmd,/tests\/spatial-lock\.mjs/);
 assert.match(cmd,/tests\/spatial-tier-lock-hardening\.mjs --suite=all/);
 assert.match(pkg.scripts['lock:e2e'],/test:e2e/);
 assert.match(src,/await chromium\.launch\(/);
 assert.match(src,/await page\.goto\(/);
 assert.match(src,/report\.console\.length/);
});
test('mobile touch and reduced motion are tested without claiming real devices',()=>{
 for(const marker of ['runMobileTouchJourney(browser, report)','isMobile: true','hasTouch: true',"reducedMotion: 'reduce'",'.tap()',"physicalDeviceCertified: false",'await context.close()']) assert.ok(src.includes(marker),marker);
});
test('release has no optional browser fallback',()=>{
 assert.doesNotMatch(pkg.scripts['test:e2e'],/run-optional-e2e|run-playwright-tests\.mjs/);
 assert.doesNotMatch(src,/Skipping e2e|Running static Playwright contract/);
});
test('browser package is resolved from Tier 1 workspace under pnpm 10', () => {
  assert.match(src, /createRequire\(new URL\('\.\.\/urai-tier1\/package\.json'/);
  assert.match(src, /requireTierOne\('playwright'\)/);
  assert.doesNotMatch(src, /node_modules\/playwright\/index\.js/);
});

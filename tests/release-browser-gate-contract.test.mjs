import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const src=readFileSync(new URL('./spatial-canonical-browser-acceptance.mjs',import.meta.url),'utf8');
const legacy=readFileSync(new URL('./spatial-tier-lock-hardening.mjs',import.meta.url),'utf8');
test('release requires real browser and canonical current routes rather than old scene stage',()=>{
 const cmd=pkg.scripts['test:e2e'];
 assert.match(cmd,/playwright:ensure/);
 assert.match(cmd,/node tests\/spatial-lock\.mjs/);
 assert.match(cmd,/node tests\/spatial-canonical-browser-acceptance\.mjs --suite=all/);
 assert.match(pkg.scripts['lock:e2e'],/test:e2e/);
 assert.match(src,/await chromium\.launch/);
 assert.doesNotMatch(src,/getByTestId\('urai-scene-stage'\)/);
 assert.match(legacy,/data-scene-mode/);
});
test('all seven route-owner acceptance suites fail closed without removing old tests',()=>{
 for(const marker of ["const NAMES=['home','sample','navigation','race','data','visual','mobile']",'await SUITES[name](page)','report.failures.push','ensure(report.failures.length===0','ensure(report.console.length===0'])assert.ok(src.includes(marker),marker);
 assert.match(src,/process\.exitCode=1/);
});
test('signed-out Life Map private-data fence and explicit demo are required',()=>{
 for(const marker of ["[data-private-memory-mounted=\"false\"]",'Open disclosed sample',"u.searchParams.get('demo')==='1'","[data-testid=\"urai-r3f-canonical-lifemap\"]"])assert.ok(src.includes(marker),marker);
 assert.doesNotMatch(src,/FIREBASE_TOKEN|GOOGLE_APPLICATION_CREDENTIALS|productionGrant=true/);
});
test('Home keyboard, Focus Replay Escape, mobile touch and reduced motion are observable',()=>{
 for(const marker of ["page.keyboard.press('Enter')","page.keyboard.press('Escape')","await pathIs(page,'/replay'","await pathIs(page,'/focus'","await pathIs(page,'/life-map'","hasTouch:true","reducedMotion:'reduce'","await link.tap()","physicalDeviceCertified:false"])assert.ok(src.includes(marker),marker);
});
test('browser dependency resolves from the installed Tier 1 package under pnpm',()=>{
 assert.match(src,/createRequire\(new URL\('\.\.\/urai-tier1\/package\.json'/);
 assert.match(src,/requireTierOne\('playwright'\)/);
 assert.doesNotMatch(src,/node_modules\/playwright\/index\.js/);
 assert.doesNotMatch(pkg.scripts['test:e2e'],/run-optional-e2e|spatial-tier-lock-hardening\.mjs/);
});

test('selected Life Map inspector remains visible for explicit disclosed sample navigation', () => {
  const css=readFileSync(new URL('../urai-tier1/src/components/lifemap/lifeMapSemanticNavigatorOwnership.css',import.meta.url),'utf8');
  const component=readFileSync(new URL('../urai-tier1/src/components/lifemap/LifeMapSemanticNavigator.tsx',import.meta.url),'utf8');
  assert.ok(css.includes('html.urai-route-life-map body .life-map-semantic-inspector {'));
  assert.ok(css.includes('display: grid !important;'));
  assert.ok(component.includes('selected && open ? <aside className="life-map-semantic-inspector"'));
  assert.ok(component.includes('(!explicitDemo && !selected.authorizedMemory)'));
});

test('multi-route browser visual acceptance waits for original hydration and still fails on console errors',()=>{
 assert.ok(src.includes("await page.waitForLoadState('load')"));
 assert.ok(src.includes("await settleRoute(page)"));
 assert.ok(src.includes("requestAnimationFrame(() => requestAnimationFrame(resolve))"));
 assert.ok(src.includes("report.console.push(name+': '+msg.text().slice(0,14000))"));
 assert.ok(src.includes("ensure(report.console.length===0"));
});

test('screenshots leave caret styles unchanged while React hydrates',()=>{
 assert.ok(src.includes("page.screenshot({path,fullPage:true,caret:'initial'})"));
 assert.ok(src.includes("ensure(report.console.length===0"));
 assert.ok(!src.includes("page.screenshot({path,fullPage:true})"));
});

test('canonical browser navigation must exercise same-Focus star stepping and retain Replay Escape identity',()=>{
 assert.ok(src.includes('await focusStarNavigation(page)'));
 assert.ok(src.includes('async function focusStarNavigation(page)'));
 assert.ok(src.includes('data-focus-star-step="verified-visible-memory-only"'));
 assert.ok(src.includes("steps.getByRole('button',{name:'Next star'})"));
 assert.ok(src.includes("steps.getByRole('button',{name:'Previous star'})"));
 assert.ok(src.includes("await pathIs(page,'/replay'"));
 assert.ok(src.includes("await pathIs(page,'/focus'"));
 assert.ok(src.includes('Replay Escape lost the last disclosed Focus star'));
 assert.ok(src.includes("u.pathname==='/focus'"));
 assert.doesNotMatch(src,/productionGrant=true|FIREBASE_TOKEN|GOOGLE_APPLICATION_CREDENTIALS/);
});

test('Focus browser sample uses canonical demo identity before and after Replay',()=>{
 assert.ok(src.includes("memoryId=demo:quiet-reset&manifestId=replay-recovery-thread"));
 assert.ok(src.includes("u.searchParams.get('memoryId')?.startsWith('demo:')"));
 assert.ok(src.includes("getAttribute('data-memory-id')===id"));
 assert.ok(!src.includes("getAttribute('data-memory-id')==='demo:'+id"));
 assert.ok(src.includes("u.searchParams.get('memoryId')==='demo:quiet-reset'"));
});

test('R867 second Replay visit must retain star and node identity in real browser',()=>{
 assert.ok(src.includes('Second Replay Escape lost the selected Focus memory'));
 assert.ok(src.includes('Second Replay Escape changed the selected constellation node'));
 assert.ok(src.includes('Replay Escape lost the selected constellation node'));
 assert.ok(src.includes('Focus demo step selected the wrong constellation node'));
 assert.ok(src.includes('const secondBefore=new URL(page.url()).searchParams.get(\'node\')'));
 assert.ok(src.includes('await focusStarNavigation(page)'));
});

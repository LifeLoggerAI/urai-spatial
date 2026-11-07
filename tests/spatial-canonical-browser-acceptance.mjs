// Canonical release browser acceptance. Uses only public, disclosed sample data;
// never authenticates, reads private customer data, or grants render authority.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const requireTierOne=createRequire(new URL('../urai-tier1/package.json', import.meta.url));
const { chromium }=requireTierOne('playwright');
const BASE=process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING=process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const DIR=process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/spatial-canonical-browser';
const SELECTED=(process.argv.find(v=>v.startsWith('--suite=')) || '--suite=all').slice(8);
const NAMES=['home','sample','navigation','race','data','visual','mobile'];
mkdirSync(DIR,{recursive:true});
const report={schemaVersion:1,head:process.env.URAI_EXPECTED_HEAD||null,selected:SELECTED,
 browserExecution:'required',mobileEmulation:true,physicalDeviceCertified:false,
 privateMediaCertified:false,checks:[],screenshots:[],console:[],failures:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function serverReady(){
 const started=Date.now();
 while(Date.now()-started<90000){try{const r=await fetch(BASE+'/home');if(r.status<500)return;}catch{}await sleep(1000);}
 throw new Error('Canonical Home server unavailable');
}
function startServer(){if(USE_EXISTING)return null;
 return spawn('pnpm',['--filter','urai-tier1','dev','--port','3000'],{cwd:process.cwd(),env:{...process.env,CI:'1'},stdio:'inherit',shell:process.platform==='win32'});
}
function attach(page,name){
 page.on('console',msg=>{if(msg.type()==='error')report.console.push(name+': '+msg.text().slice(0,14000));});
 page.on('pageerror',err=>report.console.push(name+': '+err.message.slice(0,500)));
}
async function shot(page,name){
 const path=DIR+'/'+name+'.png';// Retain source DOM styles during React hydration; Playwright defaults to caret:'hide'.
 await page.screenshot({path,fullPage:true,caret:'initial'});report.screenshots.push(path);
}
async function pathIs(page,path,limit=24000){
 await page.waitForURL(u=>u.pathname.replace(/\/+$/,'')===path,{timeout:limit});
}
// A multi-route visual test must allow each original SSR hydration to settle
// before leaving that route. Errors are still captured and remain fatal.
async function settleRoute(page){
 await page.waitForLoadState('load');
 await page.evaluate(() => new Promise(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function visibleOne(page,selectors,limit=30000){
 const loc=page.locator(selectors.join(',')).first();
 await loc.waitFor({state:'visible',timeout:limit});return loc;
}
function ensure(v,reason){if(!v)throw new Error(reason);}
async function home(page){
 await page.goto(BASE+'/home',{waitUntil:'domcontentloaded'});
 await visibleOne(page,['[data-home-visual-owner]','[data-testid="urai-home-accessible-fallback"]']);
 const link=page.getByTestId('home-semantic-life-map');
 await link.waitFor({state:'attached',timeout:20000});
 ensure((await link.getAttribute('href')||'').includes('/life-map'),'Home link lacks Life Map target');
 await link.focus();ensure(await link.evaluate(e=>document.activeElement===e),'Home semantic link not keyboard focusable');
 await page.keyboard.press('Enter');
 await pathIs(page,'/life-map',25000);
 await visibleOne(page,['[data-testid="urai-life-map-signed-out-disclosure"]','[data-testid="urai-life-map-signed-out-threshold"]']);
 const privateFlag=await page.locator('[data-private-memory-mounted]').first().getAttribute('data-private-memory-mounted');
 ensure(privateFlag==='false','Signed-out Life Map mounted private memory');
 await shot(page,'home-keyboard-to-signedout-lifemap');
}
async function sample(page){
 await page.goto(BASE+'/life-map',{waitUntil:'domcontentloaded'});
 await visibleOne(page,['[data-testid="urai-life-map-signed-out-disclosure"]','[data-testid="urai-life-map-signed-out-threshold"]']);
 ensure(await page.locator('[data-private-memory-mounted="false"]').count()>0,'No explicit signed-out private-data fence');
 await page.getByRole('button',{name:'Open disclosed sample'}).first().click();
 await page.waitForURL(u=>u.pathname==='/life-map'&&u.searchParams.get('demo')==='1',{timeout:28000});
 await visibleOne(page,['[data-testid="urai-r3f-canonical-lifemap"]','[data-testid="urai-life-map-authored-fallback"]']);
 ensure(!page.url().includes('ownerId='),'Demo URL unexpectedly contains owner identity');
 await shot(page,'explicit-disclosed-life-map');
}
async function openDemo(page){
 await page.goto(BASE+'/life-map?demo=1&manifestId=replay-recovery-thread',{waitUntil:'domcontentloaded'});
 await visibleOne(page,['[data-testid="urai-r3f-canonical-lifemap"]','[data-testid="urai-life-map-authored-fallback"]']);
 const trigger=page.getByTestId('life-map-semantic-trigger');
 await trigger.waitFor({state:'visible',timeout:30000});
 await trigger.click();
 await visibleOne(page,['[data-life-map-semantic-result]']);
 await page.locator('[data-life-map-semantic-result]').first().click();
 await visibleOne(page,['.semantic-thresholds button']);
}
async function navigation(page){
 await openDemo(page);
 const focus=page.locator('.semantic-thresholds button').filter({hasText:/focus/i}).first();
 await focus.click();
 await pathIs(page,'/focus',30000);
 await page.getByTestId('urai-final-focus-chamber').waitFor({state:'visible',timeout:25000});
 await shot(page,'disclosed-sample-focus');
 const replay=page.locator('.focusControls button.primary');
 await replay.waitFor({state:'visible',timeout:25000});ensure(await replay.isEnabled(),'Disclosed sample Replay unavailable');
 await replay.click();await pathIs(page,'/replay',30000);
 await page.getByTestId('cinematic-replay-client').waitFor({state:'visible',timeout:25000});
 await shot(page,'disclosed-sample-replay');
 await page.keyboard.press('Escape');await pathIs(page,'/focus',25000);
 await page.locator('.focusControls button.unwind').click();
 await pathIs(page,'/life-map',25000);
 await shot(page,'replay-escape-to-lifemap');
 await focusStarNavigation(page);
}

// R864: exercise the new Focus-to-Focus navigation in an actual browser.
// Deliberately disclosed demo only: no owner grants, tokens, private media, or
// synthetic shortcut around the canonical memory-selection React hook.
async function focusStarNavigation(page){
 await page.goto(BASE+'/focus?demo=1&memoryId=demo:quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset',{waitUntil:'domcontentloaded'});
 const chamber=page.getByTestId('urai-final-focus-chamber');
 await chamber.waitFor({state:'visible',timeout:25000});
 await page.waitForFunction(()=>
  document.querySelector('[data-testid="urai-final-focus-chamber"]')?.getAttribute('data-memory-id')==='demo:quiet-reset',
  null,{timeout:25000});
 const help=page.locator('details.focusHelp');
 await help.locator('summary').click();
 const steps=page.locator('[data-focus-star-step="verified-visible-memory-only"]');
 await steps.waitFor({state:'visible',timeout:25000});
 const previous=steps.getByRole('button',{name:'Previous star'});
 const next=steps.getByRole('button',{name:'Next star'});
 ensure(!await previous.isEnabled(),'First disclosed star unexpectedly has a prior neighbor');
 ensure(await next.isEnabled(),'No same-Focus next star despite disclosed sample neighbors');
 await next.click();
 await page.waitForURL(u=>u.pathname==='/focus'&&u.searchParams.get('demo')==='1'
  && u.searchParams.get('memoryId')?.startsWith('demo:')&&u.searchParams.get('memoryId')!=='demo:quiet-reset',{timeout:25000});
 const steppedId=new URL(page.url()).searchParams.get('memoryId');
 await page.waitForFunction(id=>
  document.querySelector('[data-testid="urai-final-focus-chamber"]')?.getAttribute('data-memory-id')===id,
  steppedId,{timeout:25000});
 ensure(!/[?&](ownerId|planId|movieId|consent|token)=/.test(page.url()),'Focus step carried unrelated authority identifiers');
 await shot(page,'disclosed-sample-focus-star-to-star');
 if(!await help.evaluate(element=>element.open))await help.locator('summary').click();
 await previous.click();
 await page.waitForURL(u=>u.pathname==='/focus'&&u.searchParams.get('memoryId')==='demo:quiet-reset',{timeout:25000});
 await page.waitForFunction(()=>
  document.querySelector('[data-testid="urai-final-focus-chamber"]')?.getAttribute('data-memory-id')==='demo:quiet-reset',
  null,{timeout:25000});
 if(!await help.evaluate(element=>element.open))await help.locator('summary').click();
 await next.click();
 await page.waitForURL(u=>u.pathname==='/focus'&&u.searchParams.get('memoryId')===steppedId,{timeout:25000});
 await page.waitForFunction(id=>
  document.querySelector('[data-testid="urai-final-focus-chamber"]')?.getAttribute('data-memory-id')===id,
  steppedId,{timeout:25000});
 await page.locator('.focusControls button.primary').click();
 await pathIs(page,'/replay',30000);
 await page.getByTestId('cinematic-replay-client').waitFor({state:'visible',timeout:25000});
 await page.keyboard.press('Escape');
 await pathIs(page,'/focus',25000);
 ensure(new URL(page.url()).searchParams.get('memoryId')===steppedId,
  'Replay Escape lost the last disclosed Focus star');
}

async function race(page){
 await page.goto(BASE+'/life-map?demo=1&manifestId=replay-recovery-thread',{waitUntil:'domcontentloaded'});
 await visibleOne(page,['[data-testid="urai-r3f-canonical-lifemap"]','[data-testid="urai-life-map-authored-fallback"]']);
 const trigger=page.getByTestId('life-map-semantic-trigger');
 await trigger.waitFor({state:'visible',timeout:25000});
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
 ensure(new URL(page.url()).pathname==='/life-map','Life Map keyboard stepping left realm unexpectedly');
 await trigger.click();await visibleOne(page,['#life-map-navigator']);
 await page.keyboard.press('Escape');
 await page.locator('#life-map-navigator').waitFor({state:'hidden',timeout:10000});
 ensure(new URL(page.url()).pathname==='/life-map','Escape dismissed entire Life Map instead of semantic search');
 await shot(page,'keyboard-selection-and-dismissal');
}
async function data(page){
 await page.goto(BASE+'/focus?manifestId=missing-audit-manifest',{waitUntil:'domcontentloaded'});
 await page.getByTestId('urai-final-focus-chamber').waitFor({state:'visible',timeout:26000});
 await settleRoute(page);
 ensure(await page.locator('.neutralActions').count()>0,'Missing memory did not show neutral Focus actions');
 await shot(page,'neutral-focus-without-owner');
 await page.goto(BASE+'/replay?manifestId=missing-audit-manifest',{waitUntil:'domcontentloaded'});
 await page.getByTestId('cinematic-replay-client').waitFor({state:'visible',timeout:26000});
 await settleRoute(page);
 ensure(await page.locator('[data-replay-neutral="memory-horizon"]').count()>0,'Missing replay source bypassed neutral state');
 await shot(page,'neutral-replay-without-owner');
}
async function visual(page){
 for(const [path,sel,label] of [
  ['/home','[data-home-visual-owner], [data-testid="urai-home-accessible-fallback"]','visual-canonical-home'],
  ['/life-map','[data-testid="urai-life-map-signed-out-disclosure"],[data-testid="urai-life-map-signed-out-threshold"]','visual-signedout-life-map'],
  ['/focus?manifestId=missing-audit-manifest','[data-testid="urai-final-focus-chamber"]','visual-neutral-focus'],
  ['/replay?manifestId=missing-audit-manifest','[data-testid="cinematic-replay-client"]','visual-neutral-replay']
 ]){
  await page.goto(BASE+path,{waitUntil:'domcontentloaded'});
  await page.locator(sel).first().waitFor({state:'visible',timeout:30000});
  await settleRoute(page);
  await shot(page,label);
 }
 await page.goto(BASE+'/ascent',{waitUntil:'domcontentloaded'});
 await pathIs(page,'/home',26000);
 await shot(page,'ascent-compatibility-home');
}
async function mobile(page){
 await page.goto(BASE+'/home',{waitUntil:'domcontentloaded'});
 await visibleOne(page,['[data-home-visual-owner]','[data-testid="urai-home-accessible-fallback"]']);
 ensure(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),'Mobile reduced-motion preference not honored');
 const link=page.getByTestId('home-semantic-life-map');
 await link.waitFor({state:'visible',timeout:26000});
 await link.tap();await pathIs(page,'/life-map',26000);
 await visibleOne(page,['[data-testid="urai-life-map-signed-out-disclosure"]','[data-testid="urai-life-map-signed-out-threshold"]']);
 ensure(await page.locator('[data-private-memory-mounted="false"]').count()>0,'Mobile signed-out data fence missing');
 await page.getByRole('button',{name:'Open disclosed sample'}).first().tap();
 await page.waitForURL(u=>u.pathname==='/life-map'&&u.searchParams.get('demo')==='1',{timeout:25000});
 await shot(page,'mobile-touch-reduced-motion-disclosed-demo');
}
const SUITES={home,sample,navigation,race,data,visual,mobile};
async function run(){
 const server=startServer();let browser;
 try{
  await serverReady();
  browser=await chromium.launch({headless:true});
  const requested=SELECTED==='all'?NAMES:[SELECTED];
  ensure(requested.every(n=>NAMES.includes(n)),'Unknown canonical browser suite');
  for(const name of requested){
   const ctx=await browser.newContext(name==='mobile'?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'}:{viewport:{width:1440,height:900}});
   const page=await ctx.newPage();attach(page,name);
   try{await SUITES[name](page);report.checks.push({name,status:'passed'});console.log('R855_SUITE_PASS '+name);}
   catch(err){const message=err instanceof Error?err.message:String(err);report.failures.push({name,message,url:page.url()});report.checks.push({name,status:'failed'});console.log('R855_SUITE_FAIL '+name+' '+message);try{await shot(page,'failure-'+name)}catch{}}
   finally{await ctx.close();}
  }
  ensure(report.console.length===0,'Browser emitted console/page errors: '+report.console.slice(0,5).join('; '));
  ensure(report.failures.length===0,'Canonical browser suites failed: '+report.failures.map(f=>f.name).join(', '));
  console.log('R855_CANONICAL_BROWSER_ALL_PASS');
 } finally {
  writeFileSync(DIR+'/spatial-canonical-browser-report.json',JSON.stringify(report,null,2));
  await browser?.close();
  server?.kill('SIGTERM');
 }
}
run().catch(err=>{console.error(err);process.exitCode=1});

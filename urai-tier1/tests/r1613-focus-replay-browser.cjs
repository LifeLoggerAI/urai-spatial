'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
(async()=>{
const dir='/workspace/r1613-focus-replay-ephemeral-review/evidence';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1360,height:850}}),errors=[],steps=[];
page.on('pageerror',e=>errors.push(String(e).slice(0,350)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,350))});
const base='http://127.0.0.1:3107';
const checked=async(label,fn)=>{try{let result=await fn();steps.push({label,status:'PASS',...result});}catch(e){steps.push({label,status:'FAIL',error:String(e).slice(0,500)});}};
await checked('direct synthetic Focus admits exact Memory Star',async()=>{
await page.goto(base+'/focus?memoryId=quiet-reset&node=quiet-reset&manifestId=replay-recovery-thread&demo=1',{waitUntil:'domcontentloaded'});
const el=page.locator('[data-testid="urai-final-focus-chamber"]');await el.waitFor({timeout:18000});
await page.waitForFunction(()=>document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.memoryStatus==='demo',{timeout:15000});
await page.screenshot({path:dir+'/01-focus.png'});return {memoryId:await el.getAttribute('data-memory-id'),starId:await el.getAttribute('data-star-id'),manifestId:await el.getAttribute('data-manifest-id')}});
await checked('enter Replay and retain star identity',async()=>{
await page.locator('.focusControls button.primary').click({timeout:12000});
await page.waitForURL('**/replay?**',{timeout:20000});
const el=page.locator('[data-testid="cinematic-replay-client"]');await el.waitFor();await page.waitForFunction(()=>document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.memoryStatus==='demo',{timeout:13000});
await page.screenshot({path:dir+'/02-replay.png'});return {memoryId:await el.getAttribute('data-memory-id'),starId:await el.getAttribute('data-star-id'),manifestId:await el.getAttribute('data-manifest-id')}});
await checked('Escape returns to correct Focus star and camera',async()=>{
await page.locator('[data-testid="cinematic-replay-client"] header button.unwind').click({timeout:10000});await page.waitForURL('**/focus?**',{timeout:20000});
const el=page.locator('[data-testid="urai-final-focus-chamber"]');await el.waitFor();await page.waitForFunction(()=>document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.memoryStatus==='demo',{timeout:16000});
await page.waitForTimeout(1200);
await page.screenshot({path:dir+'/03-focus-return.png'});return {memoryId:await el.getAttribute('data-memory-id'),starId:await el.getAttribute('data-star-id'),entryContinuity:await el.getAttribute('data-focus-entry-continuity'),source:await el.getAttribute('data-focus-return-source')}});
await checked('refresh retains authorization but discards transient camera',async()=>{await page.reload({waitUntil:'domcontentloaded'});const el=page.locator('[data-testid="urai-final-focus-chamber"]');await el.waitFor();await page.waitForFunction(()=>document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.memoryStatus==='demo',{timeout:13000});return{memoryId:await el.getAttribute('data-memory-id'),entryContinuity:await el.getAttribute('data-focus-entry-continuity')}});
fs.writeFileSync(dir+'/R1613_BROWSER_RECEIPT.json',JSON.stringify({source:'7ef0d06fd845ee7c77edf24ed3341dc8c47d06d8+uncommitted-local-R1613',environment:'local built Next app, explicit demo only, no authenticated private memory',steps,consoleErrors:errors},null,2));
console.log(JSON.stringify({steps,errors:errors.slice(0,6)},null,2));await browser.close();if(steps.some(x=>x.status==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

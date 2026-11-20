'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const out=process.env.URAI_VISUAL_EVIDENCE_DIR||path.resolve('evidence/r1619');
fs.mkdirSync(out,{recursive:true});
const base=process.env.URAI_VISUAL_BASE_URL||'http://127.0.0.1:31639';
function rect(r){return {x:r.x,y:r.y,w:r.width,h:r.height};}
function overlap(a,b){return !!a&&!!b&&Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+3&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+3;}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={source:'spatial-r1619-review',screens:[],pageErrors:[]};
 try{
  for(const [name,w,h,reduced] of [['desktop',1120,820,false],['mobile',390,844,true]]){
   const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
   page.on('pageerror',e=>report.pageErrors.push(name+':'+e.message));
   await page.goto(base+'/focus?memoryId=quiet-reset&node=quiet-reset&manifestId=replay-recovery-thread&demo=1',{waitUntil:'domcontentloaded',timeout:25000});
   await page.waitForFunction(()=>document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.memoryStatus==='demo',{timeout:25000});
   await page.waitForFunction(()=>document.querySelector('.focusWorld')?.dataset.webglState==='ready',{timeout:20000});
   await page.waitForTimeout(300);
   const focus=await page.evaluate(()=>({state:document.querySelector('.focusWorld')?.dataset.webglState,glow:!!document.querySelector('.focusStellarDepth'),events:getComputedStyle(document.querySelector('.focusStellarDepth')).pointerEvents}));
   await page.screenshot({path:path.join(out,name+'-focus.png')});
   await page.locator('.focusControls button.primary').click();
   await page.waitForURL('**/replay?**',{timeout:25000});
   await page.waitForFunction(()=>document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.memoryStatus==='demo',{timeout:25000});
   await page.waitForFunction(()=>document.querySelector('.replayWorld')?.dataset.webglState==='ready',{timeout:20000});
   await page.waitForTimeout(300);
   const replay=await page.evaluate(()=>{
    const q=s=>document.querySelector(s)?.getBoundingClientRect();
    const a=q('.replayWorld header'),b=q('.replayWorld .caption'),c=q('.replayWorld .memoryTempo'),d=q('.replayWorld .replaySourceStatus');
    const o=(a,b)=>!!a&&!!b&&Math.min(a.right,b.right)>Math.max(a.left,b.left)+3&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+3;
    return {state:document.querySelector('.replayWorld')?.dataset.webglState,separation:!!document.querySelector('.replayVisualSeparation'),events:getComputedStyle(document.querySelector('.replayVisualSeparation')).pointerEvents,headerCaptionOverlap:o(a,b),captionTempoOverlap:o(b,c),sourceCaptionOverlap:o(d,b),sourceVisible:!!d,viewport:{w:innerWidth,h:innerHeight}};
   });
   await page.screenshot({path:path.join(out,name+'-replay.png')});
   await page.locator('.replayWorld header button.unwind').click();
   await page.waitForURL('**/focus?**',{timeout:25000});
   await page.waitForFunction(()=>document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.memoryStatus==='demo',{timeout:25000});
   await page.waitForFunction(()=>document.querySelector('.focusWorld')?.dataset.focusEntryContinuity==='focus-return',{timeout:12000});
   const restored=await page.locator('.focusWorld').getAttribute('data-focus-entry-continuity');
   await page.screenshot({path:path.join(out,name+'-return.png')});
   report.screens.push({name,focus,replay,restored});
   await page.close();
  }
  fs.writeFileSync(path.join(out,'r1619-browser-qa-final.json'),JSON.stringify(report,null,2)+'\n');
  console.log('R1619_VISUAL_BROWSER_QA '+JSON.stringify(report));
  if(report.pageErrors.length||report.screens.some(x=>x.restored!=='focus-return'||!x.focus.glow||x.focus.events!=='none'||!x.replay.separation||x.replay.events!=='none'||x.replay.headerCaptionOverlap||x.replay.captionTempoOverlap))process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error('R1619_BROWSER_FAIL',e.stack||e);process.exitCode=1});

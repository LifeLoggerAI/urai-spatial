#!/usr/bin/env node
// Run against a local exact-head Next build. Evidence stays local until explicitly archived.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const base = process.env.URAI_VISUAL_BASE_URL || 'http://127.0.0.1:3107';
const output = process.env.URAI_VISUAL_OUTPUT || '/tmp/urai-visual-acceptance';
const routes = ['/', '/life-map', '/focus', '/replay', '/ground'];
const sizes = [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:720}];
const errors = [];
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser = await chromium.launch({headless:true,...(process.env.URAI_CHROMIUM_EXECUTABLE ? {executablePath:process.env.URAI_CHROMIUM_EXECUTABLE} : {}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 for(const size of sizes) for(const route of routes){
  const page=await browser.newPage({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  const started=Date.now();
  try {
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});
   await page.waitForTimeout(6500);
   const data=await page.evaluate(()=>{
    const controls=[...document.querySelectorAll('button,a,input,[role="button"]')].filter(el=>{
     const r=el.getBoundingClientRect(),s=getComputedStyle(el);
     return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
    });
    const small=controls.filter(el=>{const r=el.getBoundingClientRect();return r.width<48||r.height<48})
      .map(el=>({label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,80),
       width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height)}));
    const canvas=document.querySelector('canvas');
    return {documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
      controls:controls.length,smallTargets:small,canvasPresent:!!canvas,
      homeReady:document.querySelector('main')?.getAttribute('data-home-assets-ready')||null};
   });
   const slug=route==='/'?'home':route.slice(1).replaceAll('/','-');
   const filename=path.join(output,size.name+'-'+slug+'.png');
   const cdp=await page.context().newCDPSession(page);
   const capture=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
   fs.writeFileSync(filename,Buffer.from(capture.data,'base64'));
   await cdp.detach();
   const sha256=crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
   const row={size:size.name,route,status:response.status(),url:page.url(),elapsedMs:Date.now()-started,
      ...data,pageErrors,screenshot:filename,sha256};
   results.push(row);
   console.log(JSON.stringify(row));
   if(row.status!==200||row.pageErrors.length||row.documentWidth>row.viewportWidth||row.smallTargets.length)errors.push(size.name+route);
  } catch(e){errors.push(size.name+route);results.push({size:size.name,route,error:e.message});console.error(size.name,route,e.message)}
  finally{await page.close()}
 }
 await browser.close();
 fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({base,results,failures:errors},null,2));
 if(errors.length){console.error('VISUAL ACCEPTANCE SMOKE FAILED',errors);process.exitCode=1}
 else console.log('VISUAL ACCEPTANCE SMOKE PASS; artistic, real-GPU and authenticated gates remain independent');
})().catch(e=>{console.error(e);process.exitCode=1});

'use strict';
// R1586 real React 19 StrictMode remount: the actual transition controller and
// provider are mounted in Chromium. Next routing is shimmed ONLY to record pushes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const { chromium }=require('playwright');
const esbuild=require('esbuild');
const world=path.resolve(__dirname,'../src/spatial/world');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'urai-return-strict-'));
async function run(){
 const harness=path.join(temp,'app.tsx');
 fs.writeFileSync(harness,`
import React,{StrictMode,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {UraiWorldStateProvider} from ${JSON.stringify(path.join(world,'WorldStateProvider'))}
import {WorldTransitionController} from ${JSON.stringify(path.join(world,'WorldTransitionController'))}
import {requestUraiWorldReturn} from ${JSON.stringify(path.join(world,'worldEvents'))}
window.__pushes=[]
window.matchMedia=()=>({matches:true,media:'(prefers-reduced-motion: reduce)',onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true}})
function App(){
 const [key,setKey]=useState(0)
 window.runReturn=(remount,again)=>{
   requestUraiWorldReturn()
   if(again)requestUraiWorldReturn()
   if(remount)setKey(v=>v+1)
 }
 return <UraiWorldStateProvider pathname="/replay"><WorldTransitionController key={key}/><span data-testid="mounted">ready</span></UraiWorldStateProvider>
}
createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>)
`);
 const bundle=path.join(temp,'app.js');
 await esbuild.build({
  entryPoints:[harness],bundle:true,platform:'browser',format:'iife',
  outfile:bundle,jsx:'automatic',nodePaths:[path.resolve(__dirname,'../../node_modules')],
  plugins:[{name:'test-only-next-router',setup(build){
   build.onResolve({filter:new RegExp('^next/navigation$')},()=>({path:'next-router',namespace:'mock'}))
   build.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:
    "export function useRouter(){return {push:(href)=>{window.__pushes.push(href);history.pushState({},'',href);},replace:(href)=>history.replaceState({},'',href)}}",
    loader:'js'}))
  }}]
 });
 const script=fs.readFileSync(bundle,'utf8');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [label,remount,again] of [
   ['immediate-strict-remount',true,false],
   ['duplicate-return-strict-remount',true,true],
   ['normal-transition',false,false]
  ]){
   const page=await browser.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    if(route.request().url().endsWith('/harness.js'))return route.fulfill({status:200,contentType:'application/javascript',body:script});
    return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body><div id="root"></div><script src="/harness.js"></script></body></html>'});
   });
   await page.goto('http://strictmode.test/replay?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1');
   await page.locator('[data-testid="mounted"]').waitFor({state:'visible'});
   await page.waitForTimeout(50);
   await page.evaluate(args=>window.runReturn(args.remount,args.again),{remount,again});
   await page.waitForFunction(()=>window.__pushes.length===1,{timeout:3500});
   const result=await page.evaluate(()=>({pushes:window.__pushes,path:location.pathname}));
   assert.equal(result.pushes.length,1,label);
   assert.equal(result.path,'/focus',label);
   assert.equal(new URL(result.pushes[0],'http://strictmode.test').searchParams.get('memoryId'),'demo:quiet-reset',label);
   assert.deepEqual(errors,[],label);
   console.log('R1586_STRICTMODE_PASS '+label);
   await page.close();
  }
 }finally{await browser.close();}
 console.log('R1586_REAL_REACT19_STRICTMODE 3/3 PASS');
}
run().catch(err=>{console.error('R1586_STRICTMODE_FAIL',err);process.exitCode=1}).finally(()=>fs.rmSync(temp,{recursive:true,force:true}));


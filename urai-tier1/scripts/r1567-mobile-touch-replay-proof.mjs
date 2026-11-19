import{spawn}from'node:child_process';import{chromium}from'playwright';import{writeFileSync}from'node:fs';
const e={PATH:process.env.PATH,HOME:process.env.HOME,USER:process.env.USER,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'};
const srv=spawn('node',['../node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4385'],{cwd:process.cwd(),env:e,stdio:'ignore'});
const out={source:'R1567 local canvas-bound OrbitControls, touch + Replay',cases:[],errors:[]};let browser;
const current=async(p)=>p.evaluate(()=>{const d=document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset;return{path:location.pathname,url:location.pathname+location.search,kind:d?.focusEntryContinuity,source:d?.focusReturnSource,mem:d?.memoryId,z:Number(d?.focusCameraZ),tz:Number(d?.focusTargetZ),fov:Number(d?.focusFov)}});
async function round(p,n,burst){
 await p.waitForFunction(()=>document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.focusInputReady==='true',{timeout:7000});
 const cdp=await p.context().newCDPSession(p);const x=38,y=500;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1,radiusX:3,radiusY:3,force:.6}]});for(let i=1;i<=7;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*15,y:y+i*8,id:1,radiusX:3,radiusY:3,force:.6}]});await p.waitForTimeout(50)}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(200);
 const before=await current(p);
 await p.locator('.focusControls button.primary').click({timeout:5000});
 await p.waitForURL(u=>u.pathname==='/replay',{timeout:8500,waitUntil:'domcontentloaded'});
 await p.getByTestId('cinematic-replay-client').waitFor({timeout:7000});
 if(burst)await p.evaluate(()=>{for(let i=0;i<24;i++)window.dispatchEvent(new Event('urai:world-return'))});
 else await p.keyboard.press('Escape');
 await p.waitForURL(u=>u.pathname==='/focus',{timeout:9000,waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.focusEntryContinuity==='focus-return',{timeout:7000});
 await p.waitForTimeout(350);const after=await current(p);
 const pass=before.mem===after.mem&&after.kind==='focus-return'&&after.source==='renderer'&&Math.abs(before.z-after.z)<.16&&Math.abs(before.tz-after.tz)<.16&&before.fov===after.fov&&after.url.includes('focusTicket=')&&!after.url.includes('entryCamera=');
 out.cases.push({round:n,burst,pass,before,after});if(!pass)throw Error('round-'+n+' failed');return after;
}
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:4385/focus',{signal:AbortSignal.timeout(600)})).status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,150))}
 if(!ready)throw Error('start failed');
 browser=await chromium.launch({executablePath:'/ms-playwright/chromium-1208/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--use-angle=vulkan','--enable-features=Vulkan','--disable-software-rasterizer']});
 const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 p.on('pageerror',x=>out.errors.push(x.message.slice(0,150)));
 await p.goto('http://127.0.0.1:4385/focus?demo=1&memoryId=quiet-reset&node=quiet-reset&manifestId=replay-recovery-thread',{waitUntil:'domcontentloaded',timeout:8000});
 await round(p,1,true);
 await round(p,2,false);
 await p.reload({waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.focusInputReady==='true',{timeout:7000});
 await p.waitForTimeout(200);const reload=await current(p);out.reload={kind:reload.kind,z:reload.z,pass:reload.kind==='default'&&Math.abs(reload.z-8.2)<.1};
 out.pass=out.cases.every(x=>x.pass&&Number.isFinite(x.before.z)&&Number.isFinite(x.after.z)&&Math.abs(x.before.z-8.2)>.2)&&out.reload.pass&&out.errors.length===0;
}catch(err){out.failure=String(err);out.pass=false}finally{if(browser)await browser.close().catch(()=>{});srv.kill('SIGTERM');writeFileSync('/tmp/urai-r1567-mobile-replay-browser.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));if(!out.pass)process.exitCode=1}

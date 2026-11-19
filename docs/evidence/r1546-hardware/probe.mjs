import {chromium} from '/tmp/urai-r1438-gpu/clean-source/node_modules/playwright/index.mjs';
import {writeFileSync} from 'node:fs';
const mode=process.argv[2]||'gl';
const executablePath='/tmp/urai-r1438-gpu/browsers/chromium-1223/chrome-linux64/chrome';
const args=['--enable-gpu','--use-gl=angle','--use-angle='+mode,'--ignore-gpu-blocklist','--disable-software-rasterizer','--enable-logging=stderr'];
const receipt={at:new Date().toISOString(),scope:'Hardware context probe only; no application journey',executablePath,args,mode};
let browser;
const timer=setTimeout(async()=>{receipt.timeout=true;console.log(JSON.stringify(receipt));try{await browser?.close()}finally{process.exit(2)}},18000);
try{
 browser=await chromium.launch({executablePath,headless:true,args,timeout:12000});
 receipt.browser=browser.version();
 const session=await browser.newBrowserCDPSession();
 const info=await session.send('SystemInfo.getInfo');
 receipt.gpu=info.gpu;
 const page=await browser.newPage();
 receipt.render=await page.evaluate(()=>{
 const result={};
 for(const type of ['webgl','webgl2']){
  const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
  const gl=canvas.getContext(type);if(!gl){result[type]={available:false};continue;}
  const dbg=gl.getExtension('WEBGL_debug_renderer_info');
  gl.clearColor(0.25,0.5,0.75,1);gl.clear(gl.COLOR_BUFFER_BIT);
  const pixels=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  result[type]={available:true,vendor:dbg?gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL):null,renderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):null,version:gl.getParameter(gl.VERSION),pixels:[...pixels],error:gl.getError()};
 }
 return result;
 });
 receipt.hardwarePass=Object.values(receipt.render).some(r=>r.available&&/NVIDIA/i.test(r.renderer)&&!/SwiftShader|llvmpipe/i.test(r.renderer)&&r.error===0&&r.pixels.join(',')==='64,128,191,255');
}catch(e){receipt.error=String(e);}
finally{await browser?.close();clearTimeout(timer);writeFileSync(new URL('./'+mode+'-receipt.json',import.meta.url),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));}

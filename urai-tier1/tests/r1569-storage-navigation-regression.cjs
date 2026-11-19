// R1569 regression: optional Home checkpoint storage must never block travel.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.resolve(__dirname,'../src/spatial/world/WorldTransitionController.tsx'),'utf8');
const start=source.indexOf('  const executeTravel = useCallback('),end=source.indexOf('  const reverseTravel = useCallback(');
assert.ok(start>=0&&end>start,'Controller callback signature changed; review test');
const js=ts.transpileModule(source.slice(start,end)+'\n;globalThis.travel=executeTravel;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function run(mode,from='home'){
 const timers=new Map(),pushed=[],saved=[];let next=0;
 const window={location:{origin:'https://example.invalid',pathname:'/home'},setTimeout(fn){const id=++next;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}};
 Object.defineProperty(window,'sessionStorage',{get(){if(mode==='getter-denied')throw Error('SecurityError');return{setItem(k,v){if(mode==='write-denied')throw Error('QuotaExceededError');saved.push({key:k,value:JSON.parse(v)})}}}});
 const ctx={window,URL,Date,useCallback:f=>f,clearTimer:()=>timers.clear(),worldRef:{current:{destination:from,cameraCheckpoint:'home-threshold'}},beginTravelRef:{current:()=>{}},timer:{current:null},navigationWatchdog:{current:null},router:{push:u=>pushed.push(u)},normalizedPathname:x=>x,buildTravelHref:r=>r.href,transitionDuration:()=>0};
 vm.runInNewContext(js,ctx);
 ctx.travel({destination:'life-map',href:'/life-map'});
 const fn=timers.values().next().value;assert.equal(typeof fn,'function');fn();
 return{pushed,saved};
}
test('normal Home checkpoint and travel',()=>{const a=run('normal');assert.deepEqual(a.pushed,['/life-map']);assert.equal(a.saved.length,1);assert.equal(a.saved[0].key,'urai-world-home-checkpoint')});
test('denied storage write still navigates',()=>{const a=run('write-denied');assert.deepEqual(a.pushed,['/life-map']);assert.equal(a.saved.length,0)});
test('denied sessionStorage getter still navigates',()=>{const a=run('getter-denied');assert.deepEqual(a.pushed,['/life-map']);assert.equal(a.saved.length,0)});
test('non-Home navigation does not inspect storage',()=>{const a=run('getter-denied','focus');assert.deepEqual(a.pushed,['/life-map'])});

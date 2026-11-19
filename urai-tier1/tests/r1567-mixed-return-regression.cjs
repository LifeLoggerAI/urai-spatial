const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('/tmp/urai-r1551/spatial/node_modules/typescript');
const root='/tmp/urai-r1551/spatial',commit='91de283f536a3109e8b3788919fc0524b1bb557b';
const src=fs.readFileSync(path.resolve(__dirname,'../src/spatial/world/WorldTransitionController.tsx'),'utf8');
function extract(start,end){const a=src.indexOf(start),b=src.indexOf(end,a);assert(a>=0&&b>a,start);return src.slice(a,b+end.length)}
const exec=extract('  const executeTravel = useCallback((request: UraiWorldTravelRequest) => {','  }, [clearTimer, router])');
const reverse=extract('  const reverseTravel = useCallback(() => {','  }, [executeTravel])');
const travelHandler=extract('    const onTravel = (event: WindowEventMap[typeof URAI_WORLD_TRAVEL_EVENT]) => {','    const onReturn = () => reverseTravel()');
const handler=travelHandler.replace('    const onReturn = () => reverseTravel()','');
const tests=[];
for(const order of ['travel-return','return-travel']){
 let next=0,callbacks=new Map(),started=[],pushed=[],cancelled=[],ticketCount=0;
 const world={destination:'replay',memoryId:'demo:quiet-reset',replayManifestId:'replay-recovery-thread',privacyMode:'held-private',demo:true};
 const phaseRef={current:'idle'},worldRef={current:world},beginTravelRef={current:r=>started.push(r.href)},timer={current:null},navigationWatchdog={current:null};
 const sandbox={useCallback:f=>f,useRef:()=>({current:null}),worldRef,phaseRef,beginTravelRef,timer,navigationWatchdog,URL,
  window:{location:{origin:'http://localhost:4400',pathname:'/replay',search:''},sessionStorage:{setItem:()=>{}},setTimeout:(fn)=>{callbacks.set(++next,fn);return next},clearTimeout:(id)=>{callbacks.delete(id)}},
  clearTimer:()=>{for(const id of callbacks.keys())cancelled.push(id);callbacks.clear()},
  router:{push:u=>pushed.push(u)},normalizedPathname:x=>x,buildTravelHref:r=>r.href,
  transitionDuration:()=>100,claimWorldReturn:r=>{if(r.current!=='idle')return false;r.current='travelling';return true},
  resolveWorldReturnDestination:()=> 'focus',
  definitionForDestination:d=>({href:d==='focus'?'/focus':'/other',cameraCheckpoint:'default',entryPortal:'default'}),
  prepareFocusViewHandoff:()=>{ticketCount++;return ticketCount===1?{nodeId:'quiet-reset',ticket:'ticket-123456789'}:null}};
 vm.runInNewContext(ts.transpileModule(exec+'\n'+reverse+'\n'+handler+'\n;globalThis.runTravel=executeTravel;globalThis.runReturn=reverseTravel;globalThis.onTravel=onTravel',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 const travel=()=>sandbox.onTravel({detail:{destination:'other',href:'/other',context:{}}});
 const back=()=>sandbox.runReturn();
 if(order==='travel-return'){travel();back()}else{back();travel()}
 for(const fn of [...callbacks.values()])fn();
 const result={order,travelStarts:started.length,pushed,phaseRef:phaseRef.current,ticketCount,pass:started.length===1 && pushed[0]===(order==='travel-return'?'/other':'/focus?node=quiet-reset&focusTicket=ticket-123456789')};
 tests.push(result);
}
console.log(JSON.stringify({source:'published #2140 plus isolated R1567 guard',tests,pass:tests.every(t=>t.pass)},null,2));
process.exitCode=tests.every(t=>t.pass)?0:2;

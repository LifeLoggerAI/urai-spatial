import test from 'node:test'
import assert from 'node:assert/strict'
import {saveFocusViewFrame,prepareFocusViewHandoff,consumeFocusViewHandoff,takeFocusViewFrame} from '../src/spatial/world/focusViewReturn.ts'
const store=new Map()
globalThis.window={crypto:{randomUUID:()=> 'ticket-valid-123456789abcdef'},sessionStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}}
const frame={memoryId:'demo:quiet-reset',manifestId:'replay-recovery-thread',nodeId:'quiet-reset',source:'renderer',position:[1,2,6],target:[0,0,-2],fov:48}
const prepare=()=>prepareFocusViewHandoff(frame.memoryId,frame.manifestId)
const consume=t=>consumeFocusViewHandoff(t,frame.memoryId,frame.manifestId,frame.nodeId)
const reset=()=>store.clear()
test('valid handoff is single use and view-only',()=>{reset();assert.equal(saveFocusViewFrame(frame),true);const t=prepare();assert.equal(t.nodeId,frame.nodeId);assert.equal(t.ticket,'ticket-valid-123456789abcdef');assert.deepEqual(consume(t.ticket).position,frame.position);assert.equal(consume(t.ticket),null)})
test('raw session frame cannot bypass ticket and cannot be reused after preparing',()=>{reset();saveFocusViewFrame(frame);assert.equal(consume('ticket-valid-123456789abcdef'),null);const t=prepare();assert.equal(takeFocusViewFrame(frame.memoryId,frame.manifestId,frame.nodeId),null);assert.equal(consume(t.ticket)?.source,'renderer')})
test('wrong ticket does not consume valid pending handoff',()=>{reset();saveFocusViewFrame(frame);const t=prepare();assert.equal(consume('forged-other-ticket'),null);assert.equal(consume(t.ticket)?.source,'renderer')})
test('wrong memory, manifest or node deny and consume matching ticket',()=>{for(const field of ['memory','manifest','node']){reset();saveFocusViewFrame(frame);const t=prepare();const a=field==='memory'?'other':frame.memoryId,b=field==='manifest'?'other':frame.manifestId,c=field==='node'?'other':frame.nodeId;assert.equal(consumeFocusViewHandoff(t.ticket,a,b,c),null);assert.equal(consume(t.ticket),null)}})
test('90-second expiration denies and consumes ticket',()=>{reset();saveFocusViewFrame(frame);const t=prepare();const key='urai:focus-return-handoff:v3';const x=JSON.parse(store.get(key));x.preparedAt-=91_000;store.set(key,JSON.stringify(x));assert.equal(consume(t.ticket),null);assert.equal(store.has(key),false)})
test('future dated ticket denied',()=>{reset();saveFocusViewFrame(frame);const t=prepare();const key='urai:focus-return-handoff:v3';const x=JSON.parse(store.get(key));x.preparedAt+=5_000;store.set(key,JSON.stringify(x));assert.equal(consume(t.ticket),null)})
test('new Replay invalidates old ticket',()=>{reset();saveFocusViewFrame(frame);const t=prepare();saveFocusViewFrame({...frame,position:[2,2,5]});assert.equal(consume(t.ticket),null);const other=prepare();assert.deepEqual(consume(other.ticket).position,[2,2,5])})
test('missing crypto denies handoff without fallback ticket',()=>{reset();saveFocusViewFrame(frame);const old=window.crypto;window.crypto={};assert.equal(prepare(),null);window.crypto=old})
test('invalid or missing storage denied',()=>{reset();assert.equal(prepare(),null);assert.equal(consume('x'),null);store.set('urai:focus-return-handoff:v3','{bad');assert.equal(consume('x'),null)})

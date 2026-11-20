import test from 'node:test'
import assert from 'node:assert/strict'
import {saveFocusViewFrame,prepareFocusViewHandoff,consumeFocusViewHandoff,takeFocusViewFrame,clearFocusViewReturn} from '../src/spatial/world/focusViewReturn.ts'
globalThis.window = {crypto:{randomUUID:()=> 'ticket-valid-123456789abcdef'}}
const frame={ownerId:'owner-a',memoryId:'demo:quiet-reset',manifestId:'replay-recovery-thread',nodeId:'quiet-reset',source:'renderer',position:[1,2,6],target:[0,0,-2],fov:48}
const prep=()=>prepareFocusViewHandoff(frame.ownerId,frame.memoryId,frame.manifestId)
const take=t=>consumeFocusViewHandoff(t,frame.ownerId,frame.memoryId,frame.manifestId,frame.nodeId)
function reset(){clearFocusViewReturn()}
test('one-use owner-bound camera ticket',()=>{reset();assert.equal(saveFocusViewFrame(frame),true);const t=prep();assert.equal(t.nodeId,frame.nodeId);assert.equal(take(t.ticket)?.source,'renderer');assert.equal(take(t.ticket),null)})
test('ticket replaces unbound view and cannot restore twice',()=>{reset();saveFocusViewFrame(frame);assert.equal(take('ticket-valid-123456789abcdef'),null);const t=prep();assert.equal(takeFocusViewFrame(frame.ownerId,frame.memoryId,frame.manifestId,frame.nodeId),null);assert.deepEqual(take(t.ticket).position,frame.position)})
test('forged token cannot burn valid ticket',()=>{reset();saveFocusViewFrame(frame);const t=prep();assert.equal(take('forged-other-ticket'),null);assert.equal(take(t.ticket)?.source,'renderer')})
test('wrong owner, memory, manifest or node consumes correct ticket and denies frame',()=>{for(let i=0;i<4;i++){reset();saveFocusViewFrame(frame);const t=prep();const args=[frame.ownerId,frame.memoryId,frame.manifestId,frame.nodeId];args[i]='other';assert.equal(consumeFocusViewHandoff(t.ticket,...args),null);assert.equal(take(t.ticket),null)}})
test('expired ticket fails safely',()=>{reset();saveFocusViewFrame(frame);const t=prep();const real=Date.now;Date.now=()=>real()+91_000;try{assert.equal(take(t.ticket),null)}finally{Date.now=real}})
test('future invalid frame fails safely',()=>{reset();const real=Date.now;Date.now=()=>real()+60_000;saveFocusViewFrame(frame);Date.now=real;assert.equal(prep(),null)})
test('new Replay invalidates old ticket',()=>{reset();saveFocusViewFrame(frame);const t=prep();saveFocusViewFrame({...frame,position:[2,2,5]});assert.equal(take(t.ticket),null);const other=prep();assert.deepEqual(take(other.ticket).position,[2,2,5])})
test('missing crypto denies without fallback ticket',()=>{reset();saveFocusViewFrame(frame);const old=window.crypto;window.crypto={};assert.equal(prep(),null);window.crypto=old})
test('account-switch clear revokes old frame and ticket',()=>{reset();saveFocusViewFrame(frame);const old=prep();clearFocusViewReturn();assert.equal(take(old.ticket),null);assert.equal(prep(),null)})
test('no browser persistence needed for valid handoff',()=>{reset();Object.defineProperty(window,'sessionStorage',{get(){throw Error('forbidden')}});saveFocusViewFrame(frame);const t=prep();assert.equal(take(t.ticket).ownerId,'owner-a')})

import test from 'node:test'
import assert from 'node:assert/strict'
import { saveFocusViewFrame, takeFocusViewFrame } from '../src/spatial/world/focusViewReturn.ts'
const store = new Map()
const sessionStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: key => store.delete(key),
}
globalThis.window = { sessionStorage }
const frame = { memoryId:'demo:quiet-reset', manifestId:'replay-recovery-thread', nodeId:'quiet-reset',
  source:'renderer',position:[1,2,6],target:[0,0,-2],fov:48 }
const take = () => takeFocusViewFrame(frame.memoryId,frame.manifestId,frame.nodeId)
function reset() { store.clear() }
test('valid renderer snapshot is restored once', () => {reset();assert.equal(saveFocusViewFrame(frame),true);assert.equal(take()?.source,'renderer');assert.equal(take(),null)})
test('fallback source is explicit, not renderer proof', () => {reset();saveFocusViewFrame({...frame,source:'fallback'});assert.equal(take()?.source,'fallback')})
test('wrong memory ID consumes and denies snapshot', () => {reset();saveFocusViewFrame(frame);assert.equal(takeFocusViewFrame('other',frame.manifestId,frame.nodeId),null);assert.equal(take(),null)})
test('wrong manifest ID consumes and denies snapshot', () => {reset();saveFocusViewFrame(frame);assert.equal(takeFocusViewFrame(frame.memoryId,'wrong',frame.nodeId),null);assert.equal(take(),null)})
test('wrong node ID consumes and denies snapshot', () => {reset();saveFocusViewFrame(frame);assert.equal(takeFocusViewFrame(frame.memoryId,frame.manifestId,'other'),null);assert.equal(take(),null)})
test('invalid coordinates are never saved', () => {reset();assert.equal(saveFocusViewFrame({...frame,position:[NaN,2,6]}),false);assert.equal(take(),null)})
test('out of range coordinates are never saved', () => {reset();assert.equal(saveFocusViewFrame({...frame,position:[1000,2,6]}),false);assert.equal(take(),null)})
test('invalid FOV is never saved', () => {reset();assert.equal(saveFocusViewFrame({...frame,fov:120}),false);assert.equal(take(),null)})
test('expired frame denied and deleted', () => {reset();saveFocusViewFrame(frame);const k=[...store.keys()][0];const v=JSON.parse(store.get(k));v.savedAt-=21*60000;store.set(k,JSON.stringify(v));assert.equal(take(),null);assert.equal(store.size,0)})
test('future dated frame denied and deleted', () => {reset();saveFocusViewFrame(frame);const k=[...store.keys()][0];const v=JSON.parse(store.get(k));v.savedAt+=60000;store.set(k,JSON.stringify(v));assert.equal(take(),null);assert.equal(store.size,0)})
test('malformed storage denied and deleted', () => {reset();store.set('urai:focus-return-camera:v2','{bad');assert.equal(take(),null);assert.equal(store.size,0)})
test('new Replay replaces old frame without reuse', () => {reset();saveFocusViewFrame(frame);saveFocusViewFrame({...frame,position:[2,2,5]});assert.deepEqual(Array.from(take().position),[2,2,5]);assert.equal(take(),null)})
test('sessionStorage blocked fails closed', () => {reset();const prior=globalThis.window;globalThis.window={sessionStorage:{getItem(){throw Error('denied')},setItem(){throw Error('denied')},removeItem(){throw Error('denied')}}};assert.equal(saveFocusViewFrame(frame),false);assert.equal(take(),null);globalThis.window=prior})

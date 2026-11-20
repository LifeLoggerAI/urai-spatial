import test from 'node:test'
import assert from 'node:assert/strict'
import { saveFocusViewFrame, takeFocusViewFrame, clearFocusViewReturn } from '../src/spatial/world/focusViewReturn.ts'
globalThis.window = { crypto: {randomUUID: () => 'ticket-valid-123456789abcdef'} }
const frame = {ownerId:'owner-a',memoryId:'demo:quiet-reset',manifestId:'replay-recovery-thread',nodeId:'quiet-reset',source:'renderer',position:[1,2,6],target:[0,0,-2],fov:48}
const take = () => takeFocusViewFrame(frame.ownerId,frame.memoryId,frame.manifestId,frame.nodeId)
test('valid owner renderer snapshot restored once', () => {clearFocusViewReturn();assert.equal(saveFocusViewFrame(frame),true);assert.equal(take()?.source,'renderer');assert.equal(take(),null)})
test('fallback frame stays explicitly fallback', () => {clearFocusViewReturn();saveFocusViewFrame({...frame,source:'fallback'});assert.equal(take()?.source,'fallback')})
test('wrong owner consumes and denies frame', () => {clearFocusViewReturn();saveFocusViewFrame(frame);assert.equal(takeFocusViewFrame('owner-b',frame.memoryId,frame.manifestId,frame.nodeId),null);assert.equal(take(),null)})
test('wrong memory ID consumes and denies frame', () => {clearFocusViewReturn();saveFocusViewFrame(frame);assert.equal(takeFocusViewFrame(frame.ownerId,'other',frame.manifestId,frame.nodeId),null);assert.equal(take(),null)})
test('wrong manifest ID consumes and denies frame', () => {clearFocusViewReturn();saveFocusViewFrame(frame);assert.equal(takeFocusViewFrame(frame.ownerId,frame.memoryId,'wrong',frame.nodeId),null);assert.equal(take(),null)})
test('wrong node ID consumes and denies frame', () => {clearFocusViewReturn();saveFocusViewFrame(frame);assert.equal(takeFocusViewFrame(frame.ownerId,frame.memoryId,frame.manifestId,'other'),null);assert.equal(take(),null)})
test('invalid coordinates or FOV are rejected', () => {clearFocusViewReturn();assert.equal(saveFocusViewFrame({...frame,position:[NaN,2,6]}),false);assert.equal(saveFocusViewFrame({...frame,position:[1000,2,6]}),false);assert.equal(saveFocusViewFrame({...frame,fov:120}),false);assert.equal(take(),null)})
test('new Replay replaces old frame and cannot be reused', () => {clearFocusViewReturn();saveFocusViewFrame(frame);saveFocusViewFrame({...frame,position:[2,2,5]});assert.deepEqual(Array.from(take().position),[2,2,5]);assert.equal(take(),null)})
test('browser storage is never accessed for camera hints', () => {clearFocusViewReturn();Object.defineProperty(window,'sessionStorage',{get(){throw Error('forbidden sessionStorage')}});Object.defineProperty(window,'localStorage',{get(){throw Error('forbidden localStorage')}});assert.equal(saveFocusViewFrame(frame),true);assert.equal(take()?.source,'renderer')})

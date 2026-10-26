import assert from 'node:assert/strict';
import test from 'node:test';
import { installLifeMapPointerInteraction } from '../src/components/lifemap/lifeMapPointerInteraction.mjs';

class Canvas extends EventTarget {
  constructor() { super(); this.style = { touchAction: 'pan-y' }; this.captured = new Set(); this.calls = []; }
  setPointerCapture(id) { this.calls.push(['capture', id]); this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.calls.push(['release', id]); this.captured.delete(id); }
}
function ptr(target, type, { id = 1, x = 10, y = 20, button = 0, primary = true } = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  for (const [name, val] of Object.entries({ pointerId: id, clientX: x, clientY: y, button, isPrimary: primary }))
    Object.defineProperty(e, name, { value: val });
  target.dispatchEvent(e);
  return e;
}
function setup() {
  const canvas = new Canvas(), hostWindow = new EventTarget(), turns = [];
  let isBlocked = false, clicks = 0;
  const cleanup = installLifeMapPointerInteraction({
    canvas, hostWindow, blocked: () => isBlocked,
    onLook: (x, y) => turns.push([x, y]),
  });
  canvas.addEventListener('click', () => { clicks += 1; });
  return { canvas, hostWindow, turns, cleanup, clicks: () => clicks, block: () => { isBlocked = true; } };
}

test('genuine Memory Star tap is not captured or blocked', () => {
  const s = setup();
  ptr(s.canvas, 'pointerdown');
  assert.equal(s.canvas.calls.length, 0);
  ptr(s.canvas, 'pointerup');
  assert.equal(s.canvas.dispatchEvent(new Event('click', { cancelable: true })), true);
  assert.equal(s.clicks(), 1);
  assert.deepEqual(s.turns, []);
  s.cleanup();
});
test('short wiggle remains a tap and does not capture', () => {
  const s = setup();
  ptr(s.canvas, 'pointerdown');
  ptr(s.canvas, 'pointermove', {x:15,y:23});
  ptr(s.canvas, 'pointerup', {x:15,y:23});
  s.canvas.dispatchEvent(new Event('click', { cancelable: true }));
  assert.equal(s.clicks(), 1);
  assert.deepEqual(s.turns, []);
  assert.deepEqual(s.canvas.calls, []);
  s.cleanup();
});
test('real drag suppresses click and captures only after threshold', () => {
  const s = setup();
  ptr(s.canvas, 'pointerdown');
  ptr(s.canvas, 'pointermove', {x:18,y:20});
  assert.deepEqual(s.turns, []);
  assert.deepEqual(s.canvas.calls, [['capture',1]]);
  const e = ptr(s.canvas, 'pointermove', {x:20,y:20});
  assert.equal(e.defaultPrevented, true);
  assert.deepEqual(s.turns, [[2,0]]);
  ptr(s.canvas, 'pointerup', {x:20,y:20});
  const click = new Event('click', { cancelable:true });
  s.canvas.dispatchEvent(click);
  assert.equal(click.defaultPrevented, true);
  assert.equal(s.clicks(), 0);
  assert.deepEqual(s.canvas.calls, [['capture',1],['release',1]]);
  s.cleanup();
});
test('drag out and back to exact origin cannot activate a star', () => {
  const s = setup();
  ptr(s.canvas, 'pointerdown');
  ptr(s.canvas, 'pointermove', {x:40,y:20});
  ptr(s.canvas, 'pointermove', {x:10,y:20});
  ptr(s.canvas, 'pointerup', {x:10,y:20});
  const click = new Event('click', { cancelable:true });
  s.canvas.dispatchEvent(click);
  assert.equal(s.clicks(), 0);
  assert.equal(click.defaultPrevented, true);
  assert.deepEqual(s.turns, [[22,0],[-30,0]]);
  s.cleanup();
});
test('next distinct tap clears previous drag suppression', () => {
  const s = setup();
  ptr(s.canvas, 'pointerdown'); ptr(s.canvas, 'pointermove', {x:40});
  ptr(s.canvas, 'pointerup', {x:40});
  s.canvas.dispatchEvent(new Event('click', {cancelable:true}));
  ptr(s.canvas, 'pointerdown'); ptr(s.canvas, 'pointerup');
  const click = new Event('click', {cancelable:true});
  s.canvas.dispatchEvent(click);
  assert.equal(s.clicks(), 1);
  assert.equal(click.defaultPrevented, false);
  s.cleanup();
});
test('secondary finger cancels active drag and suppresses selection', () => {
  const s = setup();
  ptr(s.canvas, 'pointerdown', {id:2});
  ptr(s.canvas, 'pointermove', {id:2,x:40});
  ptr(s.canvas, 'pointerdown', {id:3,primary:false});
  ptr(s.canvas, 'pointermove', {id:2,x:50});
  ptr(s.canvas, 'pointerup', {id:2});
  s.canvas.dispatchEvent(new Event('click', {cancelable:true}));
  assert.equal(s.clicks(), 0);
  assert.deepEqual(s.turns, [[22,0]]);
  assert.equal(s.canvas.captured.size, 0);
  s.cleanup();
});
test('modal activation cancels a gesture and denies the click', () => {
  const s = setup();
  ptr(s.canvas, 'pointerdown'); s.block();
  ptr(s.canvas, 'pointermove', {x:40});
  ptr(s.canvas, 'pointerup');
  s.canvas.dispatchEvent(new Event('click', {cancelable:true}));
  assert.equal(s.clicks(), 0);
  assert.deepEqual(s.turns, []);
  s.cleanup();
});
test('blur releases capture without additional motion', () => {
  const s = setup();
  ptr(s.canvas, 'pointerdown'); ptr(s.canvas, 'pointermove', {x:40});
  s.hostWindow.dispatchEvent(new Event('blur'));
  ptr(s.canvas, 'pointermove', {x:90});
  assert.equal(s.canvas.captured.size, 0);
  assert.equal(s.turns.length, 1);
  s.cleanup();
});
test('right mouse button cannot start drag-to-look', () => {
  const s = setup();
  ptr(s.canvas, 'pointerdown', {button:2});
  ptr(s.canvas, 'pointermove', {x:60});
  assert.deepEqual(s.turns, []);
  assert.deepEqual(s.canvas.calls, []);
  s.cleanup();
});
test('unmount removes input handlers and restores touch action', () => {
  const s = setup();
  assert.equal(s.canvas.style.touchAction, 'none');
  s.cleanup();
  assert.equal(s.canvas.style.touchAction, 'pan-y');
  ptr(s.canvas, 'pointerdown'); ptr(s.canvas, 'pointermove', {x:60});
  assert.deepEqual(s.turns, []);
  assert.deepEqual(s.canvas.calls, []);
});
test('invalid installation fails closed', () => {
  assert.throws(() => installLifeMapPointerInteraction({canvas:null,hostWindow:new EventTarget(),blocked:()=>false,onLook:()=>{}}), /CONFIG/);
  assert.throws(() => installLifeMapPointerInteraction({canvas:new Canvas(),hostWindow:null,blocked:()=>false,onLook:()=>{}}), /CONFIG/);
});
test('open modal blocks selection before pointer-down', () => {
  const s = setup(); s.block();
  ptr(s.canvas, 'pointerdown'); ptr(s.canvas, 'pointerup');
  const click = new Event('click', {cancelable:true});
  s.canvas.dispatchEvent(click);
  assert.equal(click.defaultPrevented, true);
  assert.equal(s.clicks(), 0);
  s.cleanup();
});

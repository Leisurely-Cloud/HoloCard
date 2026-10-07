import test from 'node:test';
import assert from 'node:assert/strict';
import { createGestures } from '../assets/web-template/gestures.js';
import { createRenderLoop, viewerPixelRatio } from '../assets/web-template/render-loop.js';
import { createLoadState } from '../assets/web-template/loading.js';

test('pinching zooms without rotating; removing one finger resumes dragging without a jump', () => {
  const rotations = [], scales = [];
  let starts = 0, ends = 0;
  const gestures = createGestures({ rotate: (...delta) => rotations.push(delta), zoom: factor => scales.push(factor),
    start: () => starts++, end: () => ends++ });
  gestures.down(1, 0, 0);
  gestures.move(1, 10, 20);
  gestures.down(2, 110, 20);
  gestures.move(2, 210, 20);
  assert.deepEqual(rotations, [[10, 20]]);
  assert.deepEqual(scales, [2]);
  gestures.up(2);
  gestures.move(1, 12, 23);
  assert.deepEqual(rotations[1], [2, 3]);
  gestures.up(1);
  gestures.up(1); // pointerup followed by lostpointercapture is one release.
  gestures.move(1, 40, 40);
  assert.equal(starts, 1);
  assert.equal(ends, 1);
  assert.equal(rotations.length, 2);
});

test('third pointers and zero-distance pinches cannot produce invalid zoom', () => {
  const scales = [];
  const gestures = createGestures({ rotate() {}, zoom: factor => scales.push(factor) });
  gestures.down(1, 0, 0);
  gestures.down(2, 0, 0);
  assert.equal(gestures.down(3, 100, 100), false);
  gestures.move(2, 100, 0);
  assert.deepEqual(scales, []);
  gestures.move(2, 200, 0);
  assert.deepEqual(scales, [2]);
});

function harness() {
  let currentTime = 0, moving = false, visible = true, id = 0;
  const pending = new Map(), frames = [];
  const loop = createRenderLoop({ render: time => frames.push(time), continuous: () => moving, visible: () => visible,
    now: () => currentTime, request: callback => { pending.set(++id, callback); return id; }, cancel: handle => pending.delete(handle) });
  return { loop, frames, pending, moving: value => { moving = value; }, visible: value => { visible = value; },
    step(time) { currentTime = time; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); } };
}

test('static frames sleep, state changes wake once, and hidden frames pause', () => {
  const h = harness();
  h.loop.wake(); h.loop.wake();
  assert.equal(h.pending.size, 1);
  h.step(0); h.step(16);
  assert.equal(h.frames.length, 1);
  assert.equal(h.pending.size, 0);
  h.loop.wake(); h.step(32);
  assert.equal(h.frames.length, 2);
  h.moving(true); h.loop.wake(); h.loop.pause();
  assert.equal(h.pending.size, 0);
  h.visible(false); h.loop.wake(); h.step(48);
  assert.equal(h.frames.length, 2);
  h.visible(true); h.loop.wake(); h.step(64);
  assert.equal(h.frames.length, 3);
});

test('continuous artwork renders at 30 fps and interaction wakes at display cadence', () => {
  const h = harness();
  h.moving(true); h.loop.wake();
  for (let t = 0; t < 1000; t += 1000 / 60) h.step(t);
  assert.ok(h.frames.length >= 29 && h.frames.length <= 31, String(h.frames.length));
  const before = h.frames.length;
  h.loop.wake(true);
  for (let t = 1000; t < 1400; t += 1000 / 60) h.step(t);
  assert.ok(h.frames.length - before >= 23);
});

test('a terminal loading failure cannot be overwritten by a late resource', () => {
  const updates = [];
  const state = createLoadState(update => updates.push(update));
  state.update('assets', 2, 7);
  state.fail('subject failed');
  state.update('assets', 7, 7);
  assert.equal(state.finish(), false);
  assert.equal(state.terminal, true);
  assert.equal(updates.length, 2);
  assert.equal(updates[1].status, 'error');
  const ready = createLoadState(update => updates.push(update));
  assert.equal(ready.finish(), true);
  assert.equal(ready.fail('late timeout'), false);
  assert.equal(updates.at(-1).status, 'ready');
});

test('mobile pixel ratio is bounded while desktop detail is retained', () => {
  assert.equal(viewerPixelRatio(3, true, 390), 1.5);
  assert.equal(viewerPixelRatio(2, false, 390), 2);
  assert.equal(viewerPixelRatio(2, true, 1200), 2);
  assert.equal(viewerPixelRatio(1, true, 390), 1);
});

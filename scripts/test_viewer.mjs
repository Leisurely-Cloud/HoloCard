import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutReliefLayers } from '../assets/web-template/relief.js';
import { fallbackLayerDepths } from '../assets/web-template/fallback-layout.js';

function mesh() {
  return { position: {z: 0}, userData: {baseScale: {value: 3}},
    scale: {value: 3, copy(source) {this.value=source.value;return this;}, multiplyScalar(factor) {this.value*=factor;return this;}} };
}

test('effects depth is independent; typography stays ahead; scaling is repeatable', () => {
  const layers = {subject:[mesh()], effects:[mesh()], text:[mesh()]};
  const values = {subjectDepth:.4, effectsDepth:.62, subjectScale:1.2};
  layoutReliefLayers(layers, values);
  const subjectZ = layers.subject[0].position.z;
  const scale = layers.subject[0].scale.value;
  layoutReliefLayers(layers, {...values, effectsDepth:-.3});
  assert.equal(layers.subject[0].position.z, subjectZ);
  assert.ok(layers.effects[0].position.z < subjectZ);
  assert.ok(layers.text[0].position.z > subjectZ);
  assert.equal(layers.subject[0].scale.value, scale);
  assert.equal(layers.text[0].scale.value, 3);
});

test('CSS fallback keeps signed depths independent and typography in front', () => {
  const profile = { backgroundDepth: -.25, subjectDepth: .4, effectsDepth: .5 };
  const z = fallbackLayerDepths(profile);
  assert.equal(z.background, -25);
  assert.equal(z.subject, 40);
  assert.equal(z.effects, 50);
  assert.ok(z.background < z.subject && z.subject < z.effects && z.effects < z.text);
  const changed = fallbackLayerDepths({ ...profile, effectsDepth: -.3 });
  assert.equal(changed.effects, -30);
  assert.equal(changed.background, z.background);
  assert.equal(changed.subject, z.subject);
  assert.equal(changed.lineart, changed.subject + 1);
  assert.ok(changed.text > changed.subject);
  const zero = fallbackLayerDepths({ backgroundDepth: 0, subjectDepth: 0, effectsDepth: 0 });
  assert.equal(zero.subject, 0);
  assert.equal(zero.background, 0);
});

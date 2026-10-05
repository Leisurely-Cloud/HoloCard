import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutReliefLayers } from '../assets/web-template/relief.js';

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

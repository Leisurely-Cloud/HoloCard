import test from 'node:test';
import assert from 'node:assert/strict';
import { viewSettings, mergeSettings, parseSettings, exportSettings } from '../assets/web-template/view-settings.js';

test('export/import round trip preserves zero, signed depths, precision, and project extensions', () => {
  const config = { title: '跃龙门', sourceMode: 'relief', assets: { model: './assets/card.glb' },
    layers: { custom: { depth: 2 } }, parameters: { effectsScale: 1.7 }, ui: { brandName: '星海', fonts: { display: 'KaiTi, serif' } },
    artDirection: { medium: 'ink', observations: 'fine gold contours' }, extension: { key: 'value' } };
  const original = structuredClone(config);
  const state = mergeSettings(viewSettings(config), { parameters: { foil: 0, subjectDepth: -2.126, subjectScale: 1.001 } });
  const exported = exportSettings(config, state);
  assert.deepEqual(config, original);
  assert.deepEqual(exported.assets, config.assets);
  assert.deepEqual(exported.extension, config.extension);
  assert.deepEqual(exported.layers, config.layers);
  assert.equal(exported.parameters.effectsScale, 1.7);
  assert.equal(exported.ui.brandName, '星海');
  assert.deepEqual(exported.ui.fonts, config.ui.fonts);
  assert.deepEqual(exported.artDirection, config.artDirection);
  assert.deepEqual(mergeSettings(viewSettings(config), parseSettings(JSON.stringify(exported))), state);
});
test('imports only presentation fields and rejects invalid values before any mutation', () => {
  const before = viewSettings({ title: 'test' });
  for (const data of [null, [], { parameters: [] }, { parameters: { foil: true } }, { parameters: { foil: -1 } },
    { parameters: { foil: 2 } }, { parameters: { subjectScale: 0 } }, { parameters: { subjectDepth: '2' } },
    { appearance: { finish: 'unknown' } }, { appearance: { background: {} } }, { ui: { palette: [] } }, { parameters: { unknown: 2 } }])
    assert.throws(() => parseSettings(JSON.stringify(data)));
  assert.throws(() => parseSettings('{'));
  assert.throws(() => parseSettings(' '.repeat(1024 * 1024 + 1)));
  assert.throws(() => parseSettings('{"appearance":{"background":"bad"}}', () => false));
  const patch = parseSettings('{"parameters":{"foil":0},"assets":{"subject":"evil"},"sourceMode":"reference","__proto__":{"polluted":true}}');
  assert.deepEqual(patch.parameters, { foil: 0 });
  assert.equal(patch.assets, undefined);
  assert.equal({}.polluted, undefined);
  assert.equal(before.parameters.foil, .52);
});
test('partial presentation edits preserve authored values without mutating their source', () => {
  const defaults = viewSettings({ ui: { palette: { ink: '#000' } } });
  const before = structuredClone(defaults);
  const patch = parseSettings('{"parameters":{"foil":0},"ui":{"palette":{"accent":"#9f773f"}}}');
  const combined = mergeSettings(defaults, patch);
  assert.equal(combined.ui.palette.ink, '#000');
  assert.equal(combined.parameters.subjectScale, defaults.parameters.subjectScale);
  assert.equal(combined.ui.palette.accent, '#9f773f');
  combined.parameters.foil = .2;
  assert.equal(patch.parameters.foil, 0);
  assert.deepEqual(defaults, before);
  assert.equal(mergeSettings(defaults, parseSettings('\uFEFF{"parameters":{"foil":0}}')).appearance.finish, 'pearl');
});

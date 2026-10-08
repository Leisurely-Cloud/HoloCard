// Portable presentation settings; artwork, model and project metadata stay intact.
export const PARAMETER_DEFAULTS = { foil: .52, subjectScale: 1, subjectDepth: .32, effectsDepth: .14, backgroundDepth: -.18 };
export const PALETTE_KEYS = ['ink', 'muted', 'accent', 'focus', 'control', 'line'];
const object = (v, name) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(`${name} 必须是对象`);
};
export function viewSettings(config) {
  return { parameters: Object.fromEntries(Object.entries(PARAMETER_DEFAULTS).map(([k, v]) => [k, config.parameters?.[k] ?? v])),
    appearance: { finish: config.appearance?.finish || 'pearl', background: config.appearance?.background || '#fafafa' },
    ui: { palette: Object.fromEntries(PALETTE_KEYS.filter(k => config.ui?.palette?.[k] !== undefined).map(k => [k, config.ui.palette[k]])) } };
}
export function mergeSettings(current, patch) {
  return { parameters: { ...current.parameters, ...patch.parameters },
    appearance: { ...current.appearance, ...patch.appearance },
    ui: { palette: { ...current.ui.palette, ...patch.ui?.palette } } };
}
export function parseSettings(text, validColor = () => true) {
  if (typeof text !== 'string' || text.length > 1024 * 1024) throw Error('配置文件不能超过 1 MB');
  let data;
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw Error('配置不是有效的 JSON'); }
  object(data, '配置');
  const patch = { parameters: {}, appearance: {}, ui: { palette: {} } };
  let count = 0;
  if (data.parameters !== undefined) {
    object(data.parameters, 'parameters');
    for (const key of Object.keys(PARAMETER_DEFAULTS)) {
      if (!Object.hasOwn(data.parameters, key)) continue;
      const v = data.parameters[key];
      if (typeof v !== 'number' || !Number.isFinite(v) || (key === 'foil' && (v < 0 || v > 1)) || (key === 'subjectScale' && v <= 0))
        throw Error(`parameters.${key} 的数值无效`);
      patch.parameters[key] = v; count++;
    }
  }
  const color = (v, field) => {
    if (typeof v !== 'string' || !v.trim()) throw Error(`${field} 不是有效颜色`);
    const normalized = validColor(v);
    if (!normalized) throw Error(`${field} 不是有效颜色`);
    return typeof normalized === 'string' ? normalized : v;
  };
  if (data.appearance !== undefined) {
    object(data.appearance, 'appearance');
    if (Object.hasOwn(data.appearance, 'finish')) {
      if (!['pearl', 'silver', 'gold', 'original'].includes(data.appearance.finish)) throw Error('appearance.finish 不受支持');
      patch.appearance.finish = data.appearance.finish; count++;
    }
    if (Object.hasOwn(data.appearance, 'background')) { patch.appearance.background = color(data.appearance.background, 'appearance.background'); count++; }
  }
  if (data.ui !== undefined) {
    object(data.ui, 'ui');
    if (data.ui.palette !== undefined) {
      object(data.ui.palette, 'ui.palette');
      for (const key of PALETTE_KEYS) if (Object.hasOwn(data.ui.palette, key)) {
        patch.ui.palette[key] = color(data.ui.palette[key], `ui.palette.${key}`); count++;
      }
    }
  }
  if (!count) throw Error('文件中没有可导入的材质、配色或景深参数');
  return patch;
}
export function exportSettings(config, state) {
  const result = structuredClone(config);
  result.parameters = { ...result.parameters, ...state.parameters };
  result.appearance = { ...result.appearance, ...state.appearance };
  result.ui = { ...result.ui, palette: { ...result.ui?.palette, ...state.ui.palette } };
  return result;
}
export function bindSettingsPanel({ document, config, read, apply, resetPose, notice }) {
  const $ = id => document.getElementById(id);
  const initial = viewSettings(config);
  let busy = false, revision = 0;
  const applyState = state => apply(state);
  $('parameter-panel').addEventListener('input', e => {
    if (e.target.type === 'range') revision++;
  });
  document.querySelectorAll('[data-finish], #foil').forEach(el => el.addEventListener(el.id === 'foil' ? 'input' : 'click', () => { revision++; }));
  for (const id of ['export-settings', 'import-settings', 'reset-settings']) $(id).disabled = false;
  $('export-settings').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportSettings(config, read()), null, 2) + '\n'], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'card-config.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notice('配置已导出');
  };
  $('import-settings').onclick = () => $('settings-file').click();
  $('settings-file').onchange = async () => {
    const file = $('settings-file').files[0]; $('settings-file').value = '';
    if (!file || busy) return;
    busy = true; const version = revision;
    try {
      if (file.size > 1024 * 1024) throw Error('配置文件不能超过 1 MB');
      const patch = parseSettings(await file.text(), value => {
        const c = value.trim();
        // Concrete colors work consistently in CSS and Three.js; reject CSS variables/currentColor.
        if (!CSS.supports('color', c) || !/^(#[\da-f]+|(?:rgb|hsl)\(.+\)|[a-z]+)$/i.test(c)
          || /^(currentcolor|transparent|inherit|initial|unset|revert)$/i.test(c)) return false;
        // Normalize modern RGB/HSL syntax into opaque hex for Three.js and portable rebuilds.
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d'); context.fillStyle = c; context.fillRect(0,0,1,1);
        const rgba = context.getImageData(0,0,1,1).data;
        return rgba[3] === 255 ? '#' + [...rgba].slice(0,3).map(n => n.toString(16).padStart(2,'0')).join('') : false;
      });
      if (version !== revision) throw Error('参数已发生变化，请重新导入');
      applyState(mergeSettings(read(), patch)); revision++; notice('配置已导入，当前作品素材保留');
    } catch (error) { notice(error.message); }
    finally { busy = false; }
  };
  $('reset-settings').onclick = () => { revision++; applyState(structuredClone(initial)); resetPose(); notice('已恢复作品默认设置'); };
  return { initial, reset() { revision++; applyState(structuredClone(initial)); } };
}

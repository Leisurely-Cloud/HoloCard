import { vertex, frontFragment, edgeFragment, backFragment, subjectFragment, effectsFragment, textFragment } from "./shaders.js";
import { createBackCanvas } from "./back-art.js";
import { layoutReliefLayers } from "./relief.js";
import { applyBrand } from "./viewer-ui.js";
import { bindCardGestures } from "./gestures.js";
import { createRenderLoop, viewerPixelRatio } from "./render-loop.js";
import { createLoadingView } from "./loading.js";
import { bindSettingsPanel, viewSettings, exportSettings } from "./view-settings.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// Icons are inline data trees (icons.data.js) — zero sub-imports at runtime,
// so no ad/privacy blocker can kill the page by blocking an icon module.
import { ICON_TREES } from "./icons.data.js";
const icons = ICON_TREES;
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const media = matchMedia("(prefers-reduced-motion: reduce)");
const loading = createLoadingView($("loading"));
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 100);
camera.position.set(0, 0, 20);
const inverse = new THREE.Matrix4();
const viewportSize = new THREE.Vector2();
const reliefLayers = { subject: [], effects: [], text: [] };
const loadedTextures = new Set();
let renderer,
  root,
  uniforms,
  config,
  shadow,
  renderLoop,
  lastTime = 0,
  elapsed = 0;
let auto = false,
  flipped = false,
  dragging = false,
  finish = "pearl",
  zoom = 1;
let targetX = -0.035,
  targetY = -0.15,
  noticeTimer;
let settingsPanel;
let presentation;
const settings = [
  ["foil", "uFoil"],
  ["scale", "uScale"],
  ["depth", "uDepth"],
  ["fx-depth", "uFxDepth"],
  ["bg-depth", "uBgDepth"],
];
function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
function backTexture(image) {
  return canvasTexture(createBackCanvas(config, image));
}
function addShadow() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
  grad.addColorStop(0, "rgba(29,35,25,0.13)");
  grad.addColorStop(0.4, "rgba(29,35,25,0.055)");
  grad.addColorStop(1, "rgba(29,35,25,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(8.8, 11.8),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(c),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.position.set(0.28, -0.48, -0.5);
  scene.add(shadow);
}
// Render a lucide node tree (["svg", attrs, [children]]) into an svg element.
function renderIconNode(node) {
  const [tag, attrs = {}, children = []] = node;
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  for (const child of children) el.appendChild(renderIconNode(child));
  return el;
}
function refreshIcons() {
  const overrides = { "stroke-width": 1.5 };
  // icons.data.js is keyed in PascalCase (Play, RotateCcw, SlidersHorizontal …) while
  // the markup uses lucide's hyphenated names (play, rotate-ccw, sliders-horizontal).
  // Looking the raw attribute up never matched, so no icon ever rendered.
  const pascal = (name) =>
    name.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  document.querySelectorAll("[data-lucide]").forEach((el) => {
    const name = el.getAttribute("data-lucide");
    const tree = icons[name] || icons[pascal(name)];
    if (!tree) return;
    const [tag, defaults = {}, children = []] = tree;
    const svg = renderIconNode([tag, { ...defaults, ...overrides }, children]);
    el.replaceChildren(svg);
  });
}
function notice(message) {
  clearTimeout(noticeTimer);
  $("notice").textContent = message;
  $("notice").hidden = false;
  noticeTimer = setTimeout(() => ($("notice").hidden = true), 2600);
}
async function init() {
  refreshIcons();
  const settingsHome = $("parameter-panel").parentElement;
  const responsiveSettings = () => {
    const panel = $("parameter-panel");
    if (matchMedia("(max-width:960px), (max-height:820px)").matches) document.querySelector("main").append(panel);
    else settingsHome.append(panel);
  };
  responsiveSettings();
  window.addEventListener("resize", responsiveSettings);
  loading.update("正在读取作品信息");
  const response = await fetch("./card-config.json", { cache: "no-cache" });
  if (!response.ok) throw Error(`作品配置未找到（HTTP ${response.status}）`);
  try { config = await response.json(); }
  catch { throw Error("作品配置格式有误，请检查 card-config.json"); }
  if (loading.terminal) return;
  if (!config || typeof config.title !== "string" || !config.assets) throw Error("作品配置缺少标题或素材清单");
  document.title = config.title + " · " + (config.ui?.brandName || "光屿");
  for (const [id, key] of [
    ["card-title", "title"],
    ["subtitle", "subtitle"],
    ["description", "description"],
    ["edition", "edition"],
    ["about-description", "description"],
    ["about-edition", "edition"],
  ])
    $(id).textContent = config[key] || "";
  $("about-title").textContent = [config.subtitle, config.title]
    .filter(Boolean)
    .join(" / ");
  applyBrand(config, document);
  presentation = viewSettings(config);
  loading.update("正在准备字体与画面");
  await document.fonts.load("500 42px Atelier");
  if (loading.terminal) return;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    // First retry with the most permissive context attributes — some setups
    // reject "high-performance" but accept the default.
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "default",
        failIfMajorPerformanceCaveat: false,
      });
    } catch (retryError) {
      // No WebGL at all (browser hardware acceleration off): switch to the
      // CSS-3D card — still layered 3D, just without the shader engine.
      await fallback3D(retryError);
      return;
    }
  }
  renderer.setClearColor(config.appearance?.background || "#fafafa", 1);
  renderer.setPixelRatio(viewerPixelRatio(devicePixelRatio, matchMedia("(pointer:coarse)").matches, stage.clientWidth));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  stage.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  const textureLoader = new THREE.TextureLoader();
  const names = ["subject", "background", "text", "back", "lineart", "effects"].filter(name => config.assets[name]);
  const labels = { subject: "主体图片", background: "背景图片", text: "文字图片", back: "背面图片", lineart: "线稿图片", effects: "特效图片", model: "卡片模型" };
  for (const name of ["subject", "background", "text", "model"]) {
    if (!config.assets[name]) throw Error(`作品配置缺少${labels[name]}`);
  }
  const total = names.length + 1;
  let completed = 0;
  loading.update(`正在载入素材 · 0 / ${total}`, 0, total);
  const tracked = async (name, task) => {
    try {
      const resource = await task();
      if (resource.isTexture) {
        if (loading.terminal) resource.dispose();
        else loadedTextures.add(resource);
      }
      completed++;
      loading.update(`正在载入素材 · ${completed} / ${total}`, completed, total);
      return resource;
    } catch { throw Error(`${labels[name]}加载失败，请检查文件或网络连接`); }
  };
  const resources = await Promise.all([
    ...names.map(name => tracked(name, () => textureLoader.loadAsync(config.assets[name]))),
    tracked("model", () => new GLTFLoader().loadAsync(config.assets.model)),
  ]);
  if (loading.terminal) { for (const texture of loadedTextures) texture.dispose(); return; }
  const gltf = resources.pop();
  const artwork = Object.fromEntries(names.map((name, index) => [name, resources[index]]));
  const textures = [artwork.subject, artwork.background, artwork.text];
  const backArt = artwork.back;
  const line = artwork.lineart
    ? artwork.lineart
    : new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  line.needsUpdate = true;
  // Optional effects overlay (sparks/thorn deco): drawn between subject and text.
  // A transparent 1x1 fallback keeps the front shader valid without it.
  const hasFx = !!config.assets.effects;
  const effects = hasFx
    ? artwork.effects
    : new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  effects.colorSpace = THREE.NoColorSpace;
  if (!hasFx) effects.needsUpdate = true;
  [...textures, line, effects].forEach((t) => {
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  });
  const p = config.parameters || {};
  const imageAspect = textures[0].image.width / textures[0].image.height;
  const fit =
    config.artworkFit ||
    (config.sourceMode === "reference"
      ? [
          Math.min(0.87, (0.87 * imageAspect) / (2 / 3)),
          Math.min(0.87, (0.87 * (2 / 3)) / imageAspect),
        ]
      : [1, 1]);
  uniforms = {
    tSubject: { value: textures[0] },
    tBackground: { value: textures[1] },
    tText: { value: textures[2] },
    tLine: { value: line },
    tEffects: { value: effects },
    tBack: { value: backTexture(backArt?.image) },
    uTime: { value: 0 },
    uView: { value: new THREE.Vector3(0, 0, 1) },
    uFit: { value: new THREE.Vector2(...fit) },
    uFoil: { value: p.foil ?? 0.52 },
    uScale: { value: p.subjectScale ?? 1 },
    uDepth: { value: p.subjectDepth ?? 0.32 },
    uBgDepth: { value: p.backgroundDepth ?? -0.18 },
    uSafeScale: { value: config.safeArea?.scale ?? 1 },
    // The shader's V axis is flipped relative to Blender's UV space, so the
    // vertical safe-area offset needs a compensating transform (x is identical).
    uSafeOffset: {
      value: new THREE.Vector2(
        config.safeArea?.offset?.[0] ?? 0,
        1 - (config.safeArea?.scale ?? 1) - (config.safeArea?.offset?.[1] ?? 0),
      ),
    },
    uFxDepth: { value: p.effectsDepth ?? 0.14 },
    uHasFx: { value: hasFx ? 1 : 0 },
    uFinish: { value: 0 },
    uHasLine: { value: config.assets.lineart ? 1 : 0 },
    uRelief: { value: config.sourceMode === "relief" ? 1 : 0 },
  };
  const material = (fragment) =>
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      side: THREE.FrontSide,
    });
  const materials = {
    web_front: material(frontFragment),
    web_back: material(backFragment),
    web_edge: material(edgeFragment),
    web_gold: new THREE.MeshBasicMaterial({ color: "#b8d6e9" }),
  };
  for (const [role,fragment] of [["web_subject",subjectFragment],["web_effects",effectsFragment],["web_text",textFragment]]) {
    materials[role] = material(fragment);
    materials[role].transparent = true;
    materials[role].depthWrite = role !== "web_effects";
  }
  loading.update("正在呈现全息效果", total, total);
  root = new THREE.Group();
  root.add(gltf.scene);
  scene.add(root);
  let faces = 0;
  gltf.scene.traverse((ob) => {
    if (!ob.isMesh) return;
    const role = ob.material?.name;
    if (role === "web_text" && config.sourceMode !== "relief") {
      ob.visible = false;
      return;
    }
    if (role === "web_front") faces++;
    ob.material = materials[role] || materials.web_edge;
    if (role === "web_subject") reliefLayers.subject.push(ob);
    if (role === "web_effects") reliefLayers.effects.push(ob);
    if (role === "web_text") reliefLayers.text.push(ob);
  });
  if (!faces) throw Error("卡片模型缺少正面材质");
  root.updateMatrixWorld(true);
  for (const meshes of Object.values(reliefLayers)) for (const mesh of meshes) {
    root.attach(mesh);
    mesh.userData.basePosition=mesh.position.clone();
    mesh.userData.baseScale=mesh.scale.clone();
  }
  if (config.sourceMode === "relief" && !reliefLayers.subject.length) throw Error("缺少独立人物层，请重新生成模型");
  addShadow();
  setupControls();
  document
    .querySelectorAll("button[disabled],input[disabled]")
    .forEach((el) => (el.disabled = false));
  new ResizeObserver(resize).observe(stage);
  resize();
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  const shaderErrors = (renderer.info.programs || []).filter(
    (p) => p.diagnostics && !p.diagnostics.runnable,
  );
  if (shaderErrors.length) {
    renderer.dispose();
    renderer.domElement.remove();
    await fallback3D(new Error("当前设备无法显示卡面材质"));
    return;
  }
  if (!loading.finish()) return;
  root.rotation.set(targetX, targetY, 0);
  window.__holo = {
    ready: true,
    config,
    renderer,
    root,
    uniforms,
    camera,
    reset,
    flip,
    modelSource: config.assets.model,
    layers: reliefLayers,
    getState: () => ({ auto, flipped, finish, zoom, dragging }),
  };
  setFinish(config.appearance?.finish || "pearl");
  settingsPanel = bindSettingsPanel({ document, config, notice, read: readPresentation, apply: applyPresentation,
    resetPose });
  setAuto(!media.matches);
  renderLoop = createRenderLoop({ render: animate, continuous: () => !media.matches || auto, visible: () => !document.hidden && !!window.__holo?.ready });
  document.addEventListener("visibilitychange", () => document.hidden ? renderLoop.pause() : renderLoop.wake());
  renderLoop.wake();
}
// Layered 3D card built with CSS 3D transforms — used only when WebGL is
// unavailable (browser hardware acceleration off). It keeps the real depth
// stack: layers float at their configured offsets, the card tilts with the
// pointer, sways when idle, flips to a gold back, and the foil sheen follows
// the cursor. If WebGL comes back, the full shader engine takes over instead.
async function fallback3D(error) {
  console.warn("[holo-card] WebGL unavailable, using CSS-3D fallback:", error);
  const roleZ = { background: -48, effects: -25, subject: -8, lineart: 24, text: 28 };
  const wrap = document.createElement("div");
  wrap.className = "fallback3d";
  const flipper = document.createElement("div");
  flipper.className = "flipper3d";
  const card = document.createElement("div");
  card.className = "card3d";
  card.id = "card3d";
  const front = document.createElement("div");
  front.className = "face3d front3d";
  const layers = new Map();
  for (const name of ["background", "effects", "subject", "lineart", "text"]) {
    if (!config?.assets?.[name]) continue;
    const layer = document.createElement("div");
    layer.className = "layer3d";
    const img = document.createElement("img");
    img.src = config.assets[name];
    img.alt = config.title || "卡片";
    img.loading = "eager";
    layer.append(img);
    front.append(layer);
    // White-background line art must not cover the subject: multiply drops the
    // white base and keeps only the dark contour strokes on top of the artwork.
    if (name === "lineart") layer.style.mixBlendMode = "multiply";
    layers.set(name, { el: layer, z: roleZ[name] });
  }
  const foil = document.createElement("div");
  foil.className = "foil3d";
  front.append(foil);
  const back = document.createElement("div");
  back.className = "face3d back3d";
  if(config.assets.back) { back.style.backgroundImage = `url("${config.assets.back}")`; back.style.backgroundSize = "cover"; }
  const backMark = document.createElement("span");
  backMark.className = "back-mark";
  backMark.textContent = config.ui?.brandName || "光屿";
  if(!config.assets.back) back.append(backMark);
  card.append(front, back);
  flipper.append(card);
  wrap.append(flipper);
  stage.append(wrap);
  const images = [...front.querySelectorAll("img")];
  if (config.assets.back) {
    const image = new Image(); image.src = config.assets.back; images.push(image);
  }
  await Promise.all(images.map(async image => {
    try { await image.decode(); }
    catch { throw Error(`${image.src.split('/').pop()}加载失败，请检查文件或网络连接`); }
  }));
  if (!loading.finish()) { wrap.remove(); return; }

  // ---- interaction state (independent of the WebGL path) ----
  let tx = -0.03, ty = -0.06, curX = 0, curY = 0, curFlip = 0, flipTarget = 0;
  let lastMove = 0, sway = !media.matches;
  let scale = 1, depthScale = 1, bgScale = 1, fxScale = 1;
  let fallbackLoop;
  const applyLayers = () => {
    for (const [name, { el, z }] of layers) {
      const s = name === "background" ? bgScale : name === "effects" ? fxScale : 1;
      el.style.transform = `translateZ(${(z * depthScale * s).toFixed(2)}px)`;
    }
  };
  applyLayers();
  bindCardGestures(stage, {
    start() { sway = false; dragging = true; stage.classList.add("dragging"); },
    rotate(dx, dy) {
      tx = THREE.MathUtils.clamp(tx + dy * .004, -.5, .5);
      ty = THREE.MathUtils.clamp(ty + dx * .006, -.5, .5);
      lastMove = performance.now();
      front.style.setProperty("--mx", `${50 + ty * 70}%`);
      front.style.setProperty("--my", `${50 + tx * 70}%`);
      fallbackLoop.wake(true);
    },
    zoom(factor) { zoom = THREE.MathUtils.clamp(zoom * factor, .82, 1.35); fallbackLoop.wake(true); },
    end() { dragging = false; stage.classList.remove("dragging"); },
  });
  const frame = (now) => {
    if (sway && now - lastMove > 1500) {
      const t = now / 1000;
      tx = Math.sin(t * 0.7) * 0.07 + 0.05;
      ty = Math.sin(t * 0.55) * 0.11 - 0.18;
    }
    const ease = media.matches ? 1 : .18;
    curX += (tx - curX) * ease;
    curY += (ty - curY) * ease;
    curFlip += (flipTarget - curFlip) * ease;
    flipper.style.transform = `rotateX(${curX.toFixed(4)}rad) rotateY(${curY.toFixed(4)}rad) scale(${scale * zoom})`;
    card.style.transform = `rotateY(${curFlip.toFixed(4)}rad)`;
  };
  fallbackLoop = createRenderLoop({ render: frame, continuous: () => sway, visible: () => !document.hidden });
  document.addEventListener("visibilitychange", () => document.hidden ? fallbackLoop.pause() : fallbackLoop.wake());
  media.addEventListener("change", () => { if (media.matches) sway = false; fallbackLoop.wake(); });
  fallbackLoop.wake();

  // ---- control wiring (mirrors the WebGL controls) ----
  const setFlip = (value) => {
    flipped = value;
    flipTarget = flipped ? Math.PI : 0;
    faceLabels();
    fallbackLoop.wake(true);
  };
  const setAutoUI = (value) => {
    sway = value;
    fallbackLoop.wake();
    const b = $("auto");
    if (!b) return;
    b.setAttribute("aria-pressed", String(value));
    b.setAttribute("aria-label", value ? "暂停旋转" : "自动旋转");
    b.title = value ? "暂停旋转" : "自动旋转";
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", value ? "pause" : "play");
    b.replaceChildren(icon);
    refreshIcons();
  };
  const fallbackFinish = (value) => {
    finish = value;
    front.classList.remove("finish-gold", "finish-silver", "finish-pearl", "finish-original");
    front.classList.add("finish-" + value);
    document
      .querySelectorAll("[data-finish]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.finish === value)));
    $("finish-name").textContent =
      { pearl: "珠光", silver: "银箔", gold: "烫金", original: "原画" }[value];
    $("foil").disabled = value === "original";
  };
  $("info").disabled = false;
  $("info").onclick = () => $("about").showModal();
  $("close-about").onclick = () => $("about").close();
  $("front").disabled = false;
  $("front").onclick = () => setFlip(false);
  $("back").disabled = false;
  $("back").onclick = () => setFlip(true);
  const depthToggleFallback = $("depth-toggle");
  if (depthToggleFallback) {
    depthToggleFallback.disabled = false;
    depthToggleFallback.onclick = () => toggleSettings();
  }
  // The hide/show control cluster that used to sit under the card is gone: it rendered
  // as four unlabelled, icon-less circles there. Flipping stays available through the
  // 正面/背面 buttons and dragging already stops the idle sway, so only the panel's
  // permanent visibility matters here.
  const bindRange = (id, output, fn, decimals = 2) => {
    $(id).disabled = false;
    $(id).addEventListener("input", () => {
      const v = Number($(id).value);
      $(output).textContent = id === 'foil' ? Math.round(v * 100) + '%' : v.toFixed(decimals);
      fn(v);
      fallbackLoop.wake(true);
    });
  };
  bindRange("scale", "scale-value", (v) => { scale = v; });
  bindRange("depth", "depth-value", (v) => {
    depthScale = Math.max(0.1, 1 + v * 4);
    applyLayers();
  });
  bindRange("bg-depth", "bg-depth-value", (v) => {
    bgScale = Math.max(0.1, 1 + v * 4);
    applyLayers();
  });
  bindRange("fx-depth", "fx-depth-value", (v) => {
    fxScale = Math.max(0.1, 1 + v * 4); applyLayers();
  });
  document.querySelectorAll("[data-finish]").forEach((b) => {
    b.disabled = false;
    b.onclick = () => { fallbackFinish(b.dataset.finish); fallbackLoop.wake(); };
  });
  bindRange("foil", "foil-value", (v) => {
    front.style.setProperty("--foil-amount", v);
    $("foil-value").textContent = Math.round(v * 100) + '%';
  }, 0);
  $("foil-value").textContent = Math.round(Number($("foil").value) * 100) + "%";
  front.style.setProperty("--foil-amount", $("foil").value);
  // Seed scale from config; depth sliders start neutral (the layered base
  // offsets above already encode the default depth profile).
  if (config.parameters?.subjectScale) {
    scale = config.parameters.subjectScale;
    $("scale").value = config.parameters.subjectScale;
  }
  applyLayers();
  fallbackFinish(config.appearance?.finish || "gold");
  const applyFallback = state => {
    presentation = state;
    for (const [id] of settings) {
      setRange(id, state.parameters[parameterKey(id)]);
      $(id).dispatchEvent(new Event('input'));
    }
    fallbackFinish(state.appearance.finish);
    applyBrand(exportSettings(config, state), document);
    fallbackLoop.wake(true);
  };
  applyFallback(presentation);
  settingsPanel = bindSettingsPanel({ document, config, notice, read: readPresentation, apply: applyFallback,
    resetPose() { tx = -.03; ty = -.06; zoom = 1; sway = false; setFlip(false); } });
  notice("浏览器未开启 WebGL：已用轻量 3D 模式显示（层次保留）");
  window.__holo = { ready: false, error: String(error), fallback3d: true,
    getState: () => ({ flipped, zoom, dragging }) };
}
function resize() {
  if (!renderer) return;
  const width = stage.clientWidth,
    height = stage.clientHeight;
  const aspect = width / height;
  if (!width || !height) return;
  const halfHeight = Math.max(config.sourceMode === "relief" ? 6.25 : 5.45, 4.5 / aspect) / zoom;
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
  const pixelRatio = viewerPixelRatio(devicePixelRatio, matchMedia("(pointer:coarse)").matches, width);
  if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio);
  renderer.getSize(viewportSize);
  if (viewportSize.x !== width || viewportSize.y !== height) renderer.setSize(width, height);
  renderLoop?.wake();
}
function setAuto(value) {
  auto = value;
  renderLoop?.wake();
  const button = $("auto");
  if (!button) return;
  button.setAttribute("aria-pressed", String(auto));
  button.setAttribute("aria-label", auto ? "暂停旋转" : "自动旋转");
  button.title = auto ? "暂停旋转" : "自动旋转";
  button.replaceChildren();
  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", auto ? "pause" : "play");
  button.append(icon);
  refreshIcons();
}
function setFinish(value) {
  finish = value;
  uniforms.uFinish.value = { pearl: 0, silver: 1, original: 2, gold: 3 }[value] ?? 3;
  document
    .querySelectorAll("[data-finish]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.finish === value)),
    );
  $("finish-name").textContent = {
    pearl: "珠光",
    silver: "银箔",
    gold: "烫金",
    original: "原画",
  }[value];
  $("foil").disabled = value === "original";
  renderLoop?.wake();
}
function readPresentation() {
  return { ...presentation, parameters: Object.fromEntries(settings.map(([id]) => [parameterKey(id), Number($(id).value)])),
    appearance: { ...presentation.appearance, finish } };
}
function parameterKey(id) {
  return { foil: 'foil', scale: 'subjectScale', depth: 'subjectDepth', 'fx-depth': 'effectsDepth', 'bg-depth': 'backgroundDepth' }[id];
}
function setRange(id, value) {
  const input = $(id);
  // Preserve valid signed depths/scales from imported configs, even outside the ordinary slider range.
  input.min = Math.min(Number(input.min), value);
  input.max = Math.max(Number(input.max), value);
  const fraction = String(value).split('.')[1];
  if (fraction?.length > 2 || /e/i.test(String(value))) input.step = 'any';
  input.value = value;
}
function applyPresentation(state) {
  presentation = state;
  settings.forEach(([id, name]) => { setRange(id, state.parameters[parameterKey(id)]); updateInput(id, name); });
  setFinish(state.appearance.finish);
  applyBrand(exportSettings(config, state), document);
  renderer.setClearColor(state.appearance.background, 1);
  renderLoop?.wake(true);
}
function faceLabels() {
  $("front").setAttribute("aria-pressed", String(!flipped));
  $("back").setAttribute("aria-pressed", String(flipped));
  $("view-label").textContent = flipped ? "02 / BACK" : "01 / FRONT";
}
function flip(value = !flipped) {
  flipped = value;
  setAuto(false);
  targetY = flipped ? Math.PI : 0;
  targetX = 0;
  faceLabels();
}
// Layered relief stack: clearly separated depths so the card reads as a
// lightbox diorama — subject / effects / text each float on their own plane
// (offsets in card-space units, card half-height ≈ 5.45).
function layoutRelief() {
  layoutReliefLayers(reliefLayers, {
    subjectDepth: Number($("depth").value),
    effectsDepth: Number($("fx-depth").value),
    subjectScale: Number($("scale").value),
  });
}
function updateInput(id, name) {
  const input = $(id);
  uniforms[name].value = Number(input.value);
  if (config.sourceMode === "relief") layoutRelief();
  $(id + "-value").value =
    id === "foil"
      ? Math.round(input.value * 100) + "%"
      : Number(input.value).toFixed(2);
  renderLoop?.wake(true);
}
function reset() {
  settingsPanel?.reset();
  resetPose();
}
function resetPose() {
  targetX = -0.035;
  targetY = -0.15;
  zoom = 1;
  flipped = false;
  setAuto(false);
  faceLabels();
  resize();
}
function toggleSettings(show = $("parameter-panel").hidden) {
  // The depth panel is shown by default and switched from the 景深调整 button next to
  // the finish control; no outside-click or Escape dismissal, so it only moves when
  // the button is pressed.
  const panel = $("parameter-panel");
  panel.hidden = !show;
  const button = $("depth-toggle");
  if (button) button.setAttribute("aria-expanded", String(show));
}
function setupControls() {
  if (config.sourceMode === "relief") {
    // Layered card relief: subject base plane 0..0.9, effects/text above it.
    $("depth").min="0.0";$("depth").max="0.9";
    $("scale").min="0.92";$("scale").max="1.3";
  }
  settings.forEach(([id, name]) => {
    setRange(id, uniforms[name].value);
    updateInput(id, name);
    $(id).addEventListener("input", () => updateInput(id, name));
  });
  bindCardGestures(stage, {
    start() {
      dragging = true;
      setAuto(false);
      stage.classList.add("dragging");
      renderLoop?.wake(true);
    },
    rotate(dx, dy) {
      const base = flipped ? Math.PI : 0;
      targetY = THREE.MathUtils.clamp(targetY + dx * 0.006, base - 0.65, base + 0.65);
      targetX = THREE.MathUtils.clamp(targetX + dy * 0.004, -0.36, 0.36);
      renderLoop?.wake(true);
    },
    zoom(factor) {
      zoom = THREE.MathUtils.clamp(zoom * factor, 0.82, 1.35);
      resize();
      renderLoop?.wake(true);
    },
    end() {
      dragging = false;
      stage.classList.remove("dragging");
    },
  });
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom - e.deltaY * 0.001, 0.82, 1.35);
      resize();
      renderLoop?.wake(true);
    },
    { passive: false },
  );
  stage.addEventListener("keydown", (e) => {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "f",
        "F",
        "r",
        "R",
        " ",
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    if (e.key === " ") {
      setAuto(!auto);
      return;
    }
    if (e.key.toLowerCase() === "f") {
      flip();
      return;
    }
    if (e.key.toLowerCase() === "r") {
      reset();
      return;
    }
    setAuto(false);
    const base = flipped ? Math.PI : 0;
    if (e.key === "ArrowLeft") targetY -= 0.08;
    if (e.key === "ArrowRight") targetY += 0.08;
    if (e.key === "ArrowUp") targetX -= 0.06;
    if (e.key === "ArrowDown") targetX += 0.06;
    targetY = THREE.MathUtils.clamp(targetY, base - 0.65, base + 0.65);
    targetX = THREE.MathUtils.clamp(targetX, -0.36, 0.36);
    renderLoop?.wake(true);
  });
  $("front").onclick = () => flip(false);
  $("back").onclick = () => flip(true);
  const depthToggle = $("depth-toggle");
  if (depthToggle) depthToggle.onclick = () => toggleSettings();
  document
    .querySelectorAll("[data-finish]")
    .forEach((b) => (b.onclick = () => setFinish(b.dataset.finish)));
  // The depth panel is permanent: no toggle button, and no dismissal on an outside
  // click or Escape any more — the controls are meant to stay in view.
  $("info").onclick = () => $("about").showModal();
  $("close-about").onclick = () => $("about").close();
  $("about").onclick = (e) => {
    if (e.target === $("about")) {
      const r = $("about").getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        $("about").close();
    }
  };
  $("save").onclick = saveCard;
  media.addEventListener("change", () => {
    if (media.matches) setAuto(false);
    renderLoop?.wake();
  });
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    renderLoop?.pause();
    showRuntimeError("图形显示已暂停，请重新加载恢复");
  });
}
function saveCard() {
  try {
    const originalSize = new THREE.Vector2();
    renderer.getSize(originalSize);
    const originalRatio = renderer.getPixelRatio();
    const bounds = {
      left: camera.left,
      right: camera.right,
      top: camera.top,
      bottom: camera.bottom,
    };
    renderer.setPixelRatio(1);
    renderer.setSize(1400, 1800, false);
    const captureHeight = config.sourceMode === "relief" ? 6.4 : 5.4;
    camera.left = -captureHeight*1400/1800;
    camera.right = captureHeight*1400/1800;
    camera.top = captureHeight;
    camera.bottom = -captureHeight;
    camera.updateProjectionMatrix();
    try {
      renderer.render(scene, camera);
      const link = document.createElement("a");
      link.download =
        (config.title || "art-card") +
        "-" +
        (flipped ? "back" : "front") +
        ".png";
      link.href = renderer.domElement.toDataURL("image/png");
      link.click();
      notice("卡片图片已保存");
    } finally {
      Object.assign(camera, bounds);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(originalRatio);
      renderer.setSize(originalSize.x, originalSize.y, false);
      renderer.render(scene, camera);
    }
  } catch (error) {
    console.error(error);
    notice("图片未能保存，请重试");
  }
}
function animate(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.06) || 0;
  lastTime = now;
  if (document.hidden) return;
  if (!media.matches || auto) elapsed += dt;
  if (auto) {
    targetY = Math.sin(elapsed * 0.42) * 0.23 - 0.055;
    targetX = Math.sin(elapsed * 0.53) * 0.055 - 0.018;
  }
  const ease = media.matches ? 1 : 1 - Math.exp(-dt * 8);
  root.rotation.x += (targetX - root.rotation.x) * ease;
  root.rotation.y += (targetY - root.rotation.y) * ease;
  root.updateMatrixWorld(true);
  uniforms.uView.value
    .copy(camera.position)
    .applyMatrix4(inverse.copy(root.matrixWorld).invert())
    .normalize();
  uniforms.uTime.value = media.matches && !auto ? 0 : elapsed;
  shadow.scale.x = 1 - Math.abs(Math.sin(root.rotation.y)) * 0.14;
  renderer.render(scene, camera);
}
function showRuntimeError(message) {
  createLoadingView($("loading")).fail(message);
  window.__holo = { ready: false, error: message };
  document.querySelectorAll("button, input, select").forEach(element => {
    if (!$("loading").contains(element) && element.id !== "close-about") element.disabled = true;
  });
}
function fail(message) {
  if (!loading.fail(message)) return;
  renderLoop?.pause();
  renderer?.dispose();
  renderer?.domElement.remove();
  renderer = null;
  for (const texture of loadedTextures) texture.dispose();
  loadedTextures.clear();
  showRuntimeError(message);
}
const loadTimeout = setTimeout(() => fail("加载时间较长，请检查网络连接后重新加载"), 30000);
init().then(() => clearTimeout(loadTimeout)).catch(error => {
  clearTimeout(loadTimeout);
  console.warn("[holo-card]", error);
  fail(error.message);
});

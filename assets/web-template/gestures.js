export function createGestures({ rotate, zoom, start = () => {}, end = () => {} }) {
  const pointers = new Map();
  const distance = () => {
    const [a, b] = [...pointers.values()];
    return b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  return {
    down(id, x, y) {
      if (pointers.size >= 2 || pointers.has(id)) return false;
      pointers.set(id, { x, y });
      if (pointers.size === 1) start();
      return true;
    },
    move(id, x, y) {
      const previous = pointers.get(id);
      if (!previous) return;
      const before = distance();
      pointers.set(id, { x, y });
      if (pointers.size === 2) {
        const after = distance();
        if (before > 0 && after > 0) zoom(after / before);
      } else rotate(x - previous.x, y - previous.y);
    },
    up(id) {
      if (pointers.delete(id) && pointers.size === 0) end();
    },
  };
}

export function bindCardGestures(stage, callbacks) {
  const gestures = createGestures(callbacks);
  stage.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button, input, a")) return;
    if (!gestures.down(event.pointerId, event.clientX, event.clientY)) return;
    stage.setPointerCapture(event.pointerId);
    if (event.pointerType === "mouse") stage.focus({ preventScroll: true });
  });
  stage.addEventListener("pointermove", event => gestures.move(event.pointerId, event.clientX, event.clientY));
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    stage.addEventListener(name, event => gestures.up(event.pointerId));
  }
}

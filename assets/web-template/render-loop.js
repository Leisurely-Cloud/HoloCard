// Render animated artwork at 30 fps, interactions at the display cadence,
// and static/reduced-motion artwork only when its state changes.
export function createRenderLoop({ render, continuous, visible = () => true,
  request = requestAnimationFrame, cancel = cancelAnimationFrame, now = () => performance.now() }) {
  let pending = null, dirty = true, lastRender = -Infinity, activeUntil = 0;
  const queue = () => {
    if (pending === null && visible()) pending = request(tick);
  };
  const tick = (time) => {
    pending = null;
    if (!visible()) return;
    const moving = continuous();
    const interval = time < activeUntil ? 0 : 1000 / 30;
    if (dirty || ((moving || time < activeUntil) && time - lastRender >= interval - .5)) {
      dirty = false;
      lastRender = time;
      render(time);
    }
    if (dirty || moving || time < activeUntil) queue();
  };
  return {
    wake(interactive = false) {
      dirty = true;
      if (interactive) activeUntil = now() + 500;
      queue();
    },
    pause() {
      if (pending !== null) cancel(pending);
      pending = null;
      dirty = true;
    },
  };
}

export function viewerPixelRatio(deviceRatio, coarsePointer, width) {
  return Math.min(deviceRatio || 1, coarsePointer && width <= 760 ? 1.5 : 2);
}

export function createLoadState(notify) {
  let terminal = false;
  return {
    get terminal() { return terminal; },
    update(message, completed = 0, total = 1) {
      if (!terminal) notify({ status: "loading", message, completed, total });
    },
    finish() {
      if (terminal) return false;
      terminal = true;
      notify({ status: "ready", message: "作品已就绪", completed: 1, total: 1 });
      return true;
    },
    fail(message) {
      if (terminal) return false;
      terminal = true;
      notify({ status: "error", message });
      return true;
    },
  };
}

export function createLoadingView(element) {
  const message = element.querySelector(".loading-message");
  const progress = element.querySelector("progress");
  const retry = element.querySelector("button");
  retry.onclick = () => location.reload();
  return createLoadState(state => {
    element.dataset.status = state.status;
    element.hidden = state.status === "ready";
    element.classList.toggle("error", state.status === "error");
    element.setAttribute("role", state.status === "error" ? "alert" : "status");
    element.parentElement.setAttribute("aria-busy", String(state.status === "loading"));
    message.textContent = state.message;
    progress.hidden = state.status !== "loading";
    if (state.total > 0) {
      progress.max = state.total;
      progress.value = state.completed;
    }
    retry.hidden = state.status !== "error";
  });
}

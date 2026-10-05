export function applyBrand(config, document) {
  const brand = document.querySelector(".wordmark-cn");
  if (brand) brand.firstChild.textContent = config.ui?.brandName || "光屿";
  const brandEn = document.querySelector(".wordmark-en");
  if (brandEn) brandEn.textContent = config.ui?.brandEnglish || "HOLO ATELIER";
  for (const [key, value] of Object.entries(config.ui?.palette || {})) {
    if (["ink", "muted", "accent", "focus", "control", "line"].includes(key)) document.documentElement.style.setProperty(`--${key}`, value);
  }
}

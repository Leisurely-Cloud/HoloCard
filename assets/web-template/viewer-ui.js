export function applyBrand(config, document) {
  const brand = document.querySelector(".wordmark-cn");
  if (brand) brand.firstChild.textContent = config.ui?.brandName || "光屿";
  const brandEn = document.querySelector(".wordmark-en");
  if (brandEn) brandEn.textContent = config.ui?.brandEnglish || "HOLO ATELIER";
  for (const key of ["ink", "muted", "accent", "focus", "control", "line"]) {
    const value = config.ui?.palette?.[key];
    if (value !== undefined) document.documentElement.style.setProperty(`--${key}`, value);
    else document.documentElement.style.removeProperty(`--${key}`);
  }
  document.documentElement.style.setProperty('--paper', config.appearance?.background || '#fafafa');
}

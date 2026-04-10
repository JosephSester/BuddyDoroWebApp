// apps/web/js/features/scene.js
const ASSET_BASE = './assets/artwork/'; // ✅ relative path works with Live Server & subpaths

function preload(srcs = []) {
  srcs.forEach(src => { const img = new Image(); img.src = src; });
}

export function initScene(opts = {}) {
  const { background = 'BackgroundDay.jpg', preloadExtra = [] } = opts;
  const el = document.getElementById('scene');
  if (!el) return;
  el.style.background = `url("${ASSET_BASE}${background}") center bottom / cover no-repeat`;
  preload([`${ASSET_BASE}${background}`, ...preloadExtra.map(n => `${ASSET_BASE}${n}`)]);
}

export function setBackground(filename) {
  const el = document.getElementById('scene');
  if (!el) return;
  el.style.background = `url("${ASSET_BASE}${filename}") center bottom / cover no-repeat`;
}

// apps/web/js/features/dragon.js
// Public assets are served from /apps/web/public, so absolute /assets/... works.
const ASSET_BASE = './assets/artwork/';
const OPEN_EYES   = 'Dragon.png';
const CLOSED_EYES = 'DragonEyesClosed.png';

let dragonEl = null;
let dragonImg = null;
let blinkTimer = null;
let autoBlinkMs = 3500;

/**
 * Initialize the dragon sprite.
 * @param {{ enableAutoBlink?: boolean, blinkMs?: number }} opts
 */
export function initDragon({ enableAutoBlink = true, blinkMs = 3500 } = {}) {
  dragonEl = document.getElementById('dragon') || null;
  dragonImg = dragonEl?.querySelector('img') || null;
  autoBlinkMs = blinkMs;

  if (!dragonImg) return;

  // Ensure we’re pointing at the open-eyes asset (normalize even if HTML had a relative path).
  const openUrl = `${ASSET_BASE}${OPEN_EYES}`;
  if (!dragonImg.src.endsWith(OPEN_EYES)) {
    dragonImg.src = openUrl;
  }

  // Keep the sprite visible and layered correctly
  dragonEl.style.visibility = 'visible';
  dragonEl.style.zIndex = '1';

  if (enableAutoBlink) startAutoBlink();

  // Pause/resume blinking when tab visibility changes
  document.addEventListener('visibilitychange', handleVisibility, { passive: true });
}

export function startAutoBlink() {
  stopAutoBlink();
  scheduleBlink(autoBlinkMs);
}

export function stopAutoBlink() {
  if (blinkTimer) {
    clearTimeout(blinkTimer);
    blinkTimer = null;
  }
}

export function showDragon() {
  if (dragonEl) dragonEl.style.visibility = 'visible';
}

export function hideDragon() {
  if (dragonEl) dragonEl.style.visibility = 'hidden';
}

/**
 * Quick blink (used by reactions as well).
 * @param {number} duration
 */
export function blink(duration = 150) {
  if (!dragonImg) return;
  dragonImg.src = `${ASSET_BASE}${CLOSED_EYES}`;
  setTimeout(() => {
    if (dragonImg) dragonImg.src = `${ASSET_BASE}${OPEN_EYES}`;
  }, duration);
}

/**
 * Little celebratory wiggle + blink.
 * Assumes you have a .dragon-wiggle animation class (e.g., in animations.css).
 */
export function celebrate(ms = 700) {
  if (!dragonEl) return;
  dragonEl.classList.add('dragon-wiggle');
  setTimeout(() => dragonEl.classList.remove('dragon-wiggle'), ms);
  blink(120);
}

// ---- internals ----
function scheduleBlink(ms) {
  stopAutoBlink();
  blinkTimer = setTimeout(function loop() {
    blink(120);
    const jitter = Math.floor(Math.random() * 1200) - 400; // +/- a bit
    blinkTimer = setTimeout(loop, Math.max(1200, ms + jitter));
  }, ms);
}

function handleVisibility() {
  if (document.hidden) {
    stopAutoBlink();
  } else {
    startAutoBlink();
  }
}

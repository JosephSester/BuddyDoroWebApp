// apps/web/js/features/dragon.js
// Public assets are served from /apps/web/public, so absolute /assets/... works.
const ASSET_BASE = './assets/artwork/';

// Default (original dragon)
const DEFAULT_OPEN_EYES   = 'Dragon.png';
const DEFAULT_CLOSED_EYES = 'DragonEyesClosed.png';

// LocalStorage keys (persist equipped skin)
const LS_OPEN_KEY   = 'buddydoro.skin.open';
const LS_CLOSED_KEY = 'buddydoro.skin.closed';

// Current active skin filenames (start with defaults; may be overridden by saved skin)
let OPEN_EYES   = DEFAULT_OPEN_EYES;
let CLOSED_EYES = DEFAULT_CLOSED_EYES;

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

  // Load saved skin if it exists
  const savedOpen = localStorage.getItem(LS_OPEN_KEY);
  const savedClosed = localStorage.getItem(LS_CLOSED_KEY);

  if (savedOpen) OPEN_EYES = savedOpen;
  if (savedClosed) CLOSED_EYES = savedClosed;

  // Ensure we’re pointing at the current open-eyes asset
  const openUrl = `${ASSET_BASE}${OPEN_EYES}`;
  dragonImg.src = openUrl;

  // Keep the sprite visible and layered correctly
  dragonEl.style.visibility = 'visible';
  dragonEl.style.zIndex = '1';

  if (enableAutoBlink) startAutoBlink();

  // Pause/resume blinking when tab visibility changes
  document.addEventListener('visibilitychange', handleVisibility, { passive: true });
}

/**
 * Equip a new skin (open/closed images).
 * If closed isn't provided yet, we reuse open for now.
 *
 * Example:
 * setDragonSkin({ open: 'Skins/Alien.png', closed: 'Skins/Alien.png' })
 */
export function setDragonSkin({ open, closed } = {}) {
  if (!open) return;

  OPEN_EYES = open;
  CLOSED_EYES = closed || open;

  // Persist
  localStorage.setItem(LS_OPEN_KEY, OPEN_EYES);
  localStorage.setItem(LS_CLOSED_KEY, CLOSED_EYES);

  // Apply immediately
  if (dragonImg) {
    dragonImg.src = `${ASSET_BASE}${OPEN_EYES}`;
  }
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

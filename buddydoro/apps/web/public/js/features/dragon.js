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
let tombstoneImg = null;
let blinkTimer = null;
let autoBlinkMs = 3500;

/**
 * Initialize the dragon sprite.
 * @param {{ enableAutoBlink?: boolean, blinkMs?: number }} opts
 */
export function initDragon({ enableAutoBlink = true, blinkMs = 3500 } = {}) {
  dragonEl = document.getElementById('dragon') || null;
  dragonImg = dragonEl?.querySelector('.dragon-img') || null;
  tombstoneImg = dragonEl?.querySelector('.tombstone-img') || null;
  const deadBtn = document.getElementById('companionDeadBtn') || null;
  const deadDialog = document.getElementById('deadCompanionDialog') || null;
  const deadBackdrop = document.getElementById('deadCompanionBackdrop') || null;
  const deadClose = document.getElementById('deadCompanionClose') || null;
  const deadCloseBottom = document.getElementById('deadCompanionCloseBottom') || null;
  autoBlinkMs = blinkMs;

  function openDeadDialog() {
    if (deadBackdrop) deadBackdrop.hidden = false;
    if (deadDialog) { deadDialog.hidden = false; deadDialog.removeAttribute('aria-hidden'); }
  }

  function closeDeadDialog() {
    if (deadBackdrop) deadBackdrop.hidden = true;
    if (deadDialog) { deadDialog.hidden = true; deadDialog.setAttribute('aria-hidden', 'true'); }
  }

  if (deadBtn) deadBtn.addEventListener('click', openDeadDialog);
  if (deadClose) deadClose.addEventListener('click', closeDeadDialog);
  if (deadCloseBottom) deadCloseBottom.addEventListener('click', closeDeadDialog);
  if (deadBackdrop) deadBackdrop.addEventListener('click', closeDeadDialog);

  // Tab switching for dead companion dialog
  const deadTabBtns = deadDialog ? deadDialog.querySelectorAll('[data-dead-tab]') : [];
  const deadTabPotions = document.getElementById('deadTabPotions') || null;
  const deadTabNewCompanion = document.getElementById('deadTabNewCompanion') || null;

  deadTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-dead-tab');
      deadTabBtns.forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      if (deadTabPotions) deadTabPotions.hidden = target !== 'potions';
      if (deadTabNewCompanion) deadTabNewCompanion.hidden = target !== 'new-companion';
    });
  });

  const buyRevivalBtn = document.getElementById('buyRevivalPotionBtn') || null;
  const revivalMsg = document.getElementById('revivalPotionMsg') || null;

  if (buyRevivalBtn) {
    buyRevivalBtn.addEventListener('click', async () => {
      const diamonds = window.Diamonds;
      if (!diamonds || diamonds.getBalance() < 2) {
        if (revivalMsg) revivalMsg.textContent = 'Not enough diamonds!';
        return;
      }
      buyRevivalBtn.disabled = true;
      const spent = await diamonds.spendDiamond(2);
      if (!spent) {
        if (revivalMsg) revivalMsg.textContent = 'Not enough diamonds!';
        buyRevivalBtn.disabled = false;
        return;
      }
      // Play revival sound effect
      const revivalSfx = new Audio('./assets/soundeffects/RevivalSFX/RevivalSFX.mp3');
      revivalSfx.play().catch(() => {});
      // Revive companion to full stats
      const cs = window.CompanionStatus;
      if (cs) {
        cs.set('happiness', 14);
        cs.set('thirst', 14);
        cs.set('hunger', 14);
      }
      closeDeadDialog();
      buyRevivalBtn.disabled = false;
      if (revivalMsg) revivalMsg.textContent = '';
    });
  }

  // "Choose a new companion" buttons
  if (deadDialog) {
    deadDialog.addEventListener('click', (e) => {
      const btn = e.target.closest('.choose-companion-btn');
      if (!btn) return;
      const open = btn.getAttribute('data-open');
      const closed = btn.getAttribute('data-closed');
      setDragonSkin({ open, closed });
      // Revive companion to full stats
      const cs = window.CompanionStatus;
      if (cs) {
        cs.set('happiness', 14);
        cs.set('thirst', 14);
        cs.set('hunger', 14);
      }
      closeDeadDialog();
    });
  }

  document.addEventListener('companion:died', () => {
    stopAutoBlink();
    if (dragonImg) dragonImg.style.visibility = 'hidden';
    if (tombstoneImg) tombstoneImg.hidden = false;
    if (deadBtn) deadBtn.hidden = false;
    const deathSfx = new Audio('./assets/soundeffects/CompanionDeathSFX/CompanionDeath.mp3');
    deathSfx.play().catch(() => {});
  });

  document.addEventListener('companion:revived', () => {
    if (dragonImg) dragonImg.style.visibility = '';
    if (tombstoneImg) tombstoneImg.hidden = true;
    if (deadBtn) deadBtn.hidden = true;
    if (enableAutoBlink) startAutoBlink();
  });

  if (!dragonImg) return;

  // If companion is already dead on page load, apply death state immediately
  // (the companion:died event fires before this module's listener is registered)
  const currentStatus = window.CompanionStatus?.get?.();
  if (currentStatus && currentStatus.health === 0) {
    stopAutoBlink();
    dragonImg.style.visibility = 'hidden';
    if (tombstoneImg) tombstoneImg.hidden = false;
    if (deadBtn) deadBtn.hidden = false;
  }

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
  if (!dragonImg || dragonImg.style.visibility === 'hidden') return;

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

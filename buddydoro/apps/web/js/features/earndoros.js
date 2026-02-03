const STORAGE_KEY = 'buddyDoro.dorosBalance';
const BLOCK_SECONDS = 5 * 60;
const DOROS_PER_BLOCK = 50;

// Earn Doros sound effect
// Use path relative to index.html (public/)
const earnDorosSound = new Audio('assets/soundeffects/EarnDoros.mp3');
earnDorosSound.volume = 0.45;

function playEarnDorosSound() {
  try {
    earnDorosSound.currentTime = 0;
    const playPromise = earnDorosSound.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(() => {
        // Ignore autoplay / user-gesture errors silently
      });
    }
  } catch (e) {
    // If audio can’t play, just fail silently.
  }
}

export function initEarnDoros(timer, topbar) {
  let balance = Number(localStorage.getItem(STORAGE_KEY)) || 0;
  let active = false;
  let earnedBlocks = 0;

  function save() {
    localStorage.setItem(STORAGE_KEY, String(balance));
  }

  function add(amount) {
    balance += amount;
    save();
    topbar?.addDoros?.(amount);
  }

  function resetSession() {
    active = false;
    earnedBlocks = 0;
  }

  timer.onStart(({ mode }) => {
    if (mode === 'focus') {
      active = true;
      earnedBlocks = 0;
    }
  });

  timer.onPause(resetSession);
  timer.onReset(resetSession);
  timer.onComplete(resetSession);

  timer.onSummary?.((payload) => {
    playEarnDorosSound();
  });

  timer.onTick(({ elapsedSeconds, mode }) => {
    if (!active || mode !== 'focus') return;

    const blocks = Math.floor(elapsedSeconds / BLOCK_SECONDS);
    if (blocks > earnedBlocks) {
      const delta = blocks - earnedBlocks;
      earnedBlocks = blocks;
      add(delta * DOROS_PER_BLOCK);
    }
  });

  return {
    getBalance: () => balance,
    spend(amount) {
      balance = Math.max(0, balance - Math.max(0, amount | 0));
      save();
      topbar?.setDoros?.(balance);
    }
  };
}

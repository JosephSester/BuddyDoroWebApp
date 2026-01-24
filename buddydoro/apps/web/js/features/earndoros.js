// EarnDoros: awards Doros based on Study timer usage
// - 50 Doros for every 5 full minutes of ACTUAL countdown elapsed in Study
// - Awards are given progressively during the countdown (every 5 minutes)
// - Gated behind explicit Start/Pause button events (stricter model)
// - Resets when timer is paused or its remaining time jumps up
// - Balance is persisted in localStorage

(function () {
  const STORAGE_KEY = "buddyDoro.dorosBalance";
  const FIVE_MIN_BLOCK = 5;       // minutes
  const DOROS_PER_BLOCK = 50;     // Doros per 5 minutes

  // Earn Doros sound effect
  // Use path relative to index.html (public/)
  const earnDorosSound = new Audio('assets/soundeffects/EarnDoros.mp3');
  earnDorosSound.volume = 0.45;


  function playEarnDorosSound() {
    try {
      earnDorosSound.currentTime = 0;  // rewind so rapid repeats work
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


  const state = {
    balance: 0,
    sessionActive: false,         // actively tracking a Study countdown
    awardedBlocks: 0,             // how many 5-min blocks already rewarded this session
    elapsedAccMinutes: 0,         // accumulated elapsed minutes based on countdown deltas
    lastRemainingMinutes: null    // last observed remaining minutes
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function getDorosDisplayEl() {
    return document.getElementById("dorosAmount");
  }

  function readBalanceFromDOM() {
    const el = getDorosDisplayEl();
    if (!el) return 0;
    const raw = (el.textContent || "").replace(/[^\d]/g, "");
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatBalance(value) {
    return Number(value).toLocaleString("en-US");
  }

  function syncBalanceToDOM() {
    const el = getDorosDisplayEl();
    if (!el) return;
    el.textContent = formatBalance(state.balance);
  }

  function saveBalance() {
    try {
      localStorage.setItem(STORAGE_KEY, String(state.balance));
    } catch (e) {
      // storage might be unavailable; ignore
    }
  }

  function loadBalance() {
    let balance = NaN;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored != null) {
        const parsed = parseInt(stored, 10);
        if (Number.isFinite(parsed)) {
          balance = parsed;
        }
      }
    } catch (e) {
      // ignore, fall back to DOM
    }

    if (!Number.isFinite(balance)) {
      balance = readBalanceFromDOM();
    }

    state.balance = balance;
    syncBalanceToDOM();
  }

  function isStudyModeActive() {
    const studyChip = document.querySelector(
      ".mode-chips button[data-mode='study']"
    );
    if (!studyChip) return false;

    return (
      studyChip.classList.contains("is-active") ||
      studyChip.getAttribute("aria-pressed") === "true"
    );
  }

  function getTimerMinutes() {
    const display = document.getElementById("timerDisplay");
    if (!display) return 0;

    const text = (display.textContent || "").trim(); // e.g., "25:00"
    const [mm, ss] = text.split(":");
    const min = parseInt(mm, 10);
    const sec = parseInt(ss, 10);

    if (!Number.isFinite(min) || !Number.isFinite(sec)) {
      return 0;
    }
    return min + sec / 60;
  }

  // Exported callback from Timer module to signal explicit Start
  function onTimerStart() {
    if (!isStudyModeActive()) return;
    state.sessionActive = true;
    state.awardedBlocks = 0;
    state.elapsedAccMinutes = 0;
    state.lastRemainingMinutes = getTimerMinutes();
    console.log('[EarnDoros] Session started (Study mode, Start button pressed)');
  }

  // Exported callback from Timer module to signal explicit Pause
  function onTimerPause() {
    state.sessionActive = false;
    console.log('[EarnDoros] Session paused (Pause button pressed)');
  }

  function flashEarnedBadge(earned) {
    const chip = document.getElementById("dorosChip");
    if (!chip) return;

    chip.setAttribute("data-earned-last", `+${earned}`);
    chip.classList.add("doros-earned");

    if (flashEarnedBadge._timerId) {
      clearTimeout(flashEarnedBadge._timerId);
    }
    flashEarnedBadge._timerId = setTimeout(() => {
      chip.classList.remove("doros-earned");
      chip.removeAttribute("data-earned-last");
    }, 2000);
  }

  function awardBlocks(newBlocks) {
    if (newBlocks <= 0) return;
    const earned = newBlocks * DOROS_PER_BLOCK;

    state.balance += earned;
    saveBalance();
    syncBalanceToDOM();
    flashEarnedBadge(earned);
    playEarnDorosSound();       // 🔊 play coin / money sound
  }

  function handleTimerTick() {
    // Only process ticks if session is explicitly active (Start was pressed)
    if (!state.sessionActive || !isStudyModeActive()) {
      return;
    }

    const remaining = getTimerMinutes(); // minutes left on timer

    // Initialize remaining on first tick of session
    if (state.lastRemainingMinutes == null) {
      state.lastRemainingMinutes = remaining;
      return;
    }

    // Compute delta from previous observation
    const delta = state.lastRemainingMinutes - remaining;

    if (delta > 0) {
      // Countdown progressed normally; accumulate elapsed minutes
      state.elapsedAccMinutes += delta;
      const completedBlocks = Math.floor(state.elapsedAccMinutes / FIVE_MIN_BLOCK);
      if (completedBlocks > state.awardedBlocks) {
        const newBlocks = completedBlocks - state.awardedBlocks;
        state.awardedBlocks = completedBlocks;
        awardBlocks(newBlocks);
      }
      state.lastRemainingMinutes = remaining;
    } else if (delta < 0) {
      // Remaining time increased (task estimate changed or timer reset).
      // Stop earning session; require explicit Start to resume.
      state.sessionActive = false;
      state.lastRemainingMinutes = null;
      state.elapsedAccMinutes = 0;
      state.awardedBlocks = 0;
      console.log('[EarnDoros] Timer duration changed; session stopped');
      return;
    }

    // End session when timer reaches zero
    if (remaining <= 0) {
      state.sessionActive = false;
      state.lastRemainingMinutes = null;
      console.log('[EarnDoros] Timer finished; session ended');
    }
  }

  function setupListeners() {
    const startBtn = document.getElementById("startBtn");
    const resetBtn = document.getElementById("resetBtn");
    const modeGroup = document.querySelector(".mode-chips");
    const timerDisplay = document.getElementById("timerDisplay");

    // Start button: explicitly gate Doros earning
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        // Check if button is now in "Pause" state (timer just started)
        const label = (startBtn.textContent || "").trim().toLowerCase();
        if (label === 'pause') {
          onTimerStart();
        } else {
          onTimerPause();
        }
      });
    }

    // Reset button: cancel earning session
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        state.sessionActive = false;
        state.lastRemainingMinutes = null;
        state.elapsedAccMinutes = 0;
        state.awardedBlocks = 0;
        console.log('[EarnDoros] Session reset');
      });
    }

    // Changing away from Study cancels current earning session
    if (modeGroup) {
      modeGroup.addEventListener("click", (evt) => {
        const btn = evt.target.closest("button[data-mode]");
        if (!btn) return;
        if (btn.dataset.mode !== "study") {
          state.sessionActive = false;
          state.lastRemainingMinutes = null;
          state.elapsedAccMinutes = 0;
          state.awardedBlocks = 0;
          console.log('[EarnDoros] Mode changed away from Study; session stopped');
        }
      });
    }

    // Watch timer display for changes; on each change, compute elapsed time
    if (timerDisplay && "MutationObserver" in window) {
      const observer = new MutationObserver(() => {
        handleTimerTick();
      });

      observer.observe(timerDisplay, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
  }

  function init() {
    loadBalance();
    setupListeners();
  }

  function spend(amount) {
    amount = Math.max(0, amount | 0);
    if (!amount) return;

    state.balance = Math.max(0, state.balance - amount);
    saveBalance();
    syncBalanceToDOM();
  }

  function getBalance() {
    return state.balance;
  }

  const EarnDoros = {
    init,
    getBalance,
    spend,
    onTimerStart,
    onTimerPause,
    _state: state
  };

  window.EarnDoros = EarnDoros;

  window.addEventListener('DOMContentLoaded', () => {
    EarnDoros.init();
  });
})();

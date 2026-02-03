// EarnDoros: awards Doros based on Study timer usage
// - 50 Doros for every 5 full minutes that ELAPSE in a Study session
// - Awards are given progressively during the countdown (every 5 minutes)
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
    sessionActive: false,
    sessionMinutesPlanned: 0,     // length at Start (minutes)
    awardedBlocks: 0              // how many 5-min blocks already rewarded this session
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

  // function saveBalance() {
  //   try {
  //     localStorage.setItem(STORAGE_KEY, String(state.balance));
  //   } catch (e) {
  //     // storage might be unavailable; ignore
  //   }
  // }

  // function loadBalance() {
  //   let balance = NaN;

  //   try {
  //     const stored = localStorage.getItem(STORAGE_KEY);
  //     if (stored != null) {
  //       const parsed = parseInt(stored, 10);
  //       if (Number.isFinite(parsed)) {
  //         balance = parsed;
  //       }
  //     }
  //   } catch (e) {
  //     // ignore, fall back to DOM
  //   }

  //   if (!Number.isFinite(balance)) {
  //     balance = readBalanceFromDOM();
  //   }

  //   state.balance = balance;
  //   syncBalanceToDOM();
  // }

  function setBalance(amount) {
  amount = Math.max(0, amount | 0);
  state.balance = amount;
  //saveBalance();
  syncBalanceToDOM();
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
    flashEarnedBadge._timerId = setTimeout(() => {
      chip.classList.remove("doros-earned");
      chip.removeAttribute("data-earned-last");
    }, 2000);
  }

  async function awardBlocks(newBlocks) {
  if (newBlocks <= 0) return;

  const earned = newBlocks * DOROS_PER_BLOCK;

  // optimistic UI update
  state.balance += earned;
  syncBalanceToDOM();
  flashEarnedBadge(earned);
  playEarnDorosSound();

  try {
    const res = await fetch('http://localhost:3000/api/user/doros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('authToken') },
      body: JSON.stringify({ delta: earned })
    });

    if (!res.ok) throw new Error('Failed to earn doros');

    const data = await res.json();

    // backend is source of truth
    state.balance = data.doros;
    syncBalanceToDOM();
  } catch (err) {
    console.error('Earn doros failed:', err);

    // rollback if backend fails
    state.balance -= earned;
    syncBalanceToDOM();
  }
}


  function handleTimerTick() {
    if (!state.sessionActive) return;
    if (!isStudyModeActive()) {
      // If they left Study mode, stop this session
      state.sessionActive = false;
      return;
    }

    const remaining = getTimerMinutes(); // minutes left on timer
    const elapsed = Math.max(
      0,
      state.sessionMinutesPlanned - remaining
    );

    // Total full 5-min blocks that have elapsed in THIS session
    const completedBlocks = Math.floor(elapsed / FIVE_MIN_BLOCK);

    if (completedBlocks > state.awardedBlocks) {
      const newBlocks = completedBlocks - state.awardedBlocks;
      state.awardedBlocks = completedBlocks;
      awardBlocks(newBlocks);
    }

    // When timer hits / passes 0, end this session
    if (remaining <= 0) {
      state.sessionActive = false;
    }
  }

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
  }

    function init() {
    //loadBalance();
    setupListeners();
  }

  async function spend(amount) {
  amount = Math.max(0, amount | 0);
  if (!amount) return;

  // optimistic UI update
  state.balance = Math.max(0, state.balance - amount);
  syncBalanceToDOM();

  try {
    const res = await fetch('http://localhost:3000/api/user/doros', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + localStorage.getItem('authToken') 
      },
      body: JSON.stringify({ delta: -amount })
    });

    if (!res.ok) throw new Error('Failed to update doros');

    const data = await res.json();

    // backend is source of truth
    state.balance = data.doros;
    syncBalanceToDOM();
  } catch (err) {
    console.error('Spend doros failed:', err);

    // optional: rollback UI
    state.balance += amount;
    syncBalanceToDOM();
  }
}


  function getBalance() {
    return state.balance;
  }

  const EarnDoros = {
    init,
    getBalance,
    spend,
    setBalance,
    _state: state
  };
}

// earndoros.js
const BLOCK_SECONDS = 5 * 60;
const DOROS_PER_BLOCK = 50;

// Earn Doros sound effect
const earnDorosSound = new Audio('assets/soundeffects/EarnDoros.mp3');
earnDorosSound.volume = 0.45;

function playEarnDorosSound() {
  try {
    earnDorosSound.currentTime = 0;
    const playPromise = earnDorosSound.play();
    if (playPromise?.then) playPromise.catch(() => {});
  } catch {}
}

export function initEarnDoros(timer, topbar) {
  let balance = 0; // Real value injected from main.js (/me)
  let active = false;
  let earnedBlocks = 0;

  function syncUI() {
    console.log('syncUI called — current balance:', balance);
    console.log('Calling topbar.setDoros with:', balance);
    topbar?.setDoros?.(balance);
  }

  async function syncToBackend(delta) {
    if (delta === 0) return;

    const oldBalance = balance;
    balance += delta;
    syncUI();

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const res = await fetch('http://localhost:3000/api/user/doros', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ delta })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`PATCH failed: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      balance = data.doros; // Backend is source of truth
      syncUI();
    } catch (err) {
      console.error('Failed to sync Doros:', err);
      balance = oldBalance; // Rollback
      syncUI();
    }
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

  timer.onSummary?.(() => playEarnDorosSound());

  timer.onTick(({ elapsedSeconds, mode }) => {
    if (!active || mode !== 'focus') return;

    const blocks = Math.floor(elapsedSeconds / BLOCK_SECONDS);
    if (blocks > earnedBlocks) {
      const deltaBlocks = blocks - earnedBlocks;
      earnedBlocks = blocks;
      syncToBackend(deltaBlocks * DOROS_PER_BLOCK);
    }
  });

  return {
    getBalance: () => balance,

    spend(amount) {
      amount = Math.max(0, Math.floor(amount));
      if (amount === 0) return;

      const oldBalance = balance;
      balance = Math.max(0, balance - amount);
      syncUI();

      // Async backend update
      (async () => {
        try {
          const token = localStorage.getItem('authToken');
          if (!token) throw new Error('No token');

          const res = await fetch('http://localhost:3000/api/user/doros', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ delta: -amount })
          });

          if (!res.ok) throw new Error(`Spend failed: ${res.status}`);

          const data = await res.json();
          balance = data.doros;
          syncUI();
        } catch (err) {
          console.error('Spend sync failed:', err);
          balance = oldBalance;
          syncUI();
        }
      })();
    },

    // Called from main.js after fetching real user data
    setBalance(newBalance) {
      balance = Math.max(0, Number(newBalance) || 0);
      syncUI();
    }
  };
}
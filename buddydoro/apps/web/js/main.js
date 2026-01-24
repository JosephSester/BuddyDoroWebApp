// apps/web/js/main.js

// Scene / sprite
import { initScene } from './features/scene.js';
import { initDragon } from './features/dragon.js';

// Auth guard: redirect to login if no token
const authToken = localStorage.getItem('authToken');
if (!authToken) {
  console.log('No auth token found. Redirecting to login...');
  window.location.href = 'login.html';
  throw new Error('Not authenticated'); // Halt further execution
}

// UI features
import { initTopbar } from './features/topbar.js';
import { initTimer } from './features/timer.js';
import { initStore } from './features/store.js';
import { initTasks, getActiveTask } from './features/tasks.js';

// document.addEventListener('DOMContentLoaded', () => {
//   initStore({
//     getDoros,
//     spendDoros
//   });
// });

// ----- 1) Background & dragon -------------------------------------------------
initScene({
  background: 'BackgroundDay.jpg',
  preloadExtra: ['Dragon.png']
});
initDragon?.(); // safe if initDragon is a no-op

// ----- 2) Topbar (greeting + Doros) ------------------------------------------
// const topbar = initTopbar({
//   userName: 'Joe',
//   startingDoros: 1250
//});
async function initUserTopbar() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/me', {
      headers: {
        'Authorization': 'Bearer ' + authToken
      }
    });

    if (!res.ok) {
      throw new Error('Failed to fetch user info');
    }

    const user = await res.json();

    return initTopbar({
      userName: user.name,
      startingDoros: user.doros
    });

  } catch (err) {
    console.error('Error fetching user info:', err);
    // fallback to defaults if needed
    return initTopbar({
      userName: 'Player',
      startingDoros: 1250
    });
  }
}

const topbar = await initUserTopbar();
// `topbar` should expose getDoros/setDoros/addDoros/subDoros/paintDoros.
// (That’s what the module code you pasted provides.)

// ----- 3) Timer ---------------------------------------------------------------
const timer = initTimer({
  // You can extend this later; for now we only need stop()
});

// ----- 4) Store ---------------------------------------------------------------
initStore({
  // Read Doros balance from EarnDoros (single source of truth)
  getDoros: () => {
    if (window.EarnDoros && typeof window.EarnDoros.getBalance === 'function') {
      return window.EarnDoros.getBalance();
    }

    // Fallback: read from the pill if EarnDoros is missing
    const el = document.getElementById('dorosAmount');
    if (!el) return 0;
    const raw = (el.textContent || '').replace(/[^\d]/g, '');
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  },

  // Spend Doros via EarnDoros
  spendDoros: (amount) => {
    if (window.EarnDoros && typeof window.EarnDoros.spend === 'function') {
      window.EarnDoros.spend(amount);
      return;
    }

    // Fallback: subtract directly from the pill if EarnDoros is missing
    const el = document.getElementById('dorosAmount');
    if (!el) return;
    const raw = (el.textContent || '').replace(/[^\d]/g, '');
    let bal = parseInt(raw, 10);
    if (!Number.isFinite(bal)) bal = 0;
    bal = Math.max(0, bal - Math.max(0, amount | 0));
    el.textContent = bal.toLocaleString('en-US');
  }
});


// ----- 5) Tasks ---------------------------------------------------------------
await initTasks({
  onActiveTaskChange: () => {
    const task = getActiveTask();
    if (task) {
      timer?.setMode?.('study', false);
      timer?.setDuration?.(task.total * 60);
      timer?.setBreakEnabled?.(false);
    } else {
      timer?.setBreakEnabled?.(true);
      timer?.setMode?.('study', true);
    }
  },
  onShouldStopTimer: () => {
    // If the active task disappears while the timer is running, stop it.
    timer?.stop?.();
  },
  onTaskEstimate: (minutes) => {
    if (!minutes || minutes <= 0) return;
    timer?.setMode?.('study', false);
    timer?.setDuration?.(minutes * 60);
    timer?.setBreakEnabled?.(false);
  },
});

// Each feature owns its own DOM and logic.
// This file only glues them together.

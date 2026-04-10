(function () {
  const MAX_TICKS = 14;
  const MIN_TICKS = 0;
  const STORAGE_KEY = 'companion.status.v2';
  const API_BASE = 'http://localhost:3000/api';

  const PRIMARY_KEYS = ['happiness', 'thirst', 'hunger'];
  const ALL_KEYS = ['health', ...PRIMARY_KEYS];
  const DECAY_INTERVAL_MS = {
    happiness: 4 * 60 * 60 * 1000,
    thirst: 6 * 60 * 60 * 1000,
    hunger: 5 * 60 * 60 * 1000
  };

  const LABELS = {
    health: 'Health',
    happiness: 'Happiness',
    thirst: 'Thirst',
    hunger: 'Hunger'
  };

  const STATIC_EMOJI = {
    health: '🛡️',
    thirst: '💧',
    hunger: '🍲'
  };

  let state = loadState();
  let root = null;
  let fillEls = {};
  let emojiEls = {};
  let tickGroups = {};
  let timerId = 0;
  let syncInFlight = false;
  let syncQueued = false;
  let isDead = false;

  function clampTicks(n) {
    return Math.max(MIN_TICKS, Math.min(MAX_TICKS, Math.trunc(Number(n) || 0)));
  }

  function nowMs() {
    return Date.now();
  }

  function deriveHealth(nextState) {
    return clampTicks(Math.floor((nextState.happiness + nextState.thirst + nextState.hunger) / 3));
  }

  function defaultState() {
    const now = nowMs();
    return {
      health: MAX_TICKS,
      happiness: MAX_TICKS,
      thirst: MAX_TICKS,
      hunger: MAX_TICKS,
      lastDecayAt: {
        happiness: now,
        thirst: now,
        hunger: now
      }
    };
  }

  function sanitizeState(input) {
    const now = nowMs();
    const next = defaultState();
    const raw = input || {};

    next.happiness = clampTicks(raw.happiness);
    next.thirst = clampTicks(raw.thirst);
    next.hunger = clampTicks(raw.hunger);
    next.health = deriveHealth(next);

    const decayRaw = raw.lastDecayAt || {};
    for (const key of PRIMARY_KEYS) {
      const val = Number(decayRaw[key]);
      next.lastDecayAt[key] = Number.isFinite(val) ? val : now;
    }

    return next;
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();

    try {
      return sanitizeState(JSON.parse(raw));
    } catch (err) {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function applyDecay() {
    const now = nowMs();
    let changed = false;

    for (const key of PRIMARY_KEYS) {
      const elapsed = Math.max(0, now - state.lastDecayAt[key]);
      const steps = Math.floor(elapsed / DECAY_INTERVAL_MS[key]);
      if (steps <= 0) continue;

      const nextValue = clampTicks(state[key] - steps);
      if (nextValue !== state[key]) {
        state[key] = nextValue;
        changed = true;
      }
      state.lastDecayAt[key] += steps * DECAY_INTERVAL_MS[key];
      changed = true;
    }

    const nextHealth = deriveHealth(state);
    if (nextHealth !== state.health) {
      state.health = nextHealth;
      changed = true;
    }

    if (changed) saveState();
    return changed;
  }

  function colorClassFor(value) {
    if (value >= 8) return 'is-green';
    if (value >= 4) return 'is-orange';
    if (value >= 1) return 'is-red';
    return '';
  }

  function emojiFor(key, value) {
    if (key !== 'happiness') return STATIC_EMOJI[key] || '';
    if (value >= 8) return '😄';
    if (value >= 4) return '🙂';
    if (value >= 1) return '😢';
    return '😢';
  }

  function renderStat(key) {
    const fill = fillEls[key];
    const emoji = emojiEls[key];
    if (!fill || !emoji) return;

    const count = state[key];
    const pct = (count / MAX_TICKS) * 100;
    const group = tickGroups[key];
    if (group) {
      group.setAttribute('aria-label', `${LABELS[key]} ${count} out of ${MAX_TICKS}`);
    }

    fill.style.width = `${pct}%`;
    fill.classList.remove('is-green', 'is-orange', 'is-red');
    const colorClass = colorClassFor(count);
    if (colorClass) fill.classList.add(colorClass);

    emoji.textContent = emojiFor(key, count);
    const emojiPct = Math.max(2, Math.min(98, pct));
    emoji.style.left = `${emojiPct}%`;
  }

  function checkDeathState() {
    const nowDead = state.health === MIN_TICKS;
    if (nowDead && !isDead) {
      isDead = true;
      document.dispatchEvent(new CustomEvent('companion:died'));
    } else if (!nowDead && isDead) {
      isDead = false;
      document.dispatchEvent(new CustomEvent('companion:revived'));
    }
  }

  function renderAll() {
    for (const key of ALL_KEYS) renderStat(key);
    checkDeathState();
  }

  function createRow(key) {
    const row = document.createElement('div');
    row.className = 'companion-status-row';

    const label = document.createElement('div');
    label.className = 'companion-status-label';
    label.textContent = LABELS[key];
    row.appendChild(label);

    const barWrap = document.createElement('div');
    barWrap.className = 'companion-status-barwrap';

    const track = document.createElement('div');
    track.className = 'companion-status-ticks';
    track.setAttribute('role', 'img');
    track.setAttribute('aria-label', `${LABELS[key]} ${state[key]} out of ${MAX_TICKS}`);

    const fill = document.createElement('span');
    fill.className = 'companion-status-fill';
    track.appendChild(fill);
    fillEls[key] = fill;
    tickGroups[key] = track;

    const emoji = document.createElement('span');
    emoji.className = 'companion-status-emoji';
    emoji.setAttribute('aria-hidden', 'true');
    emoji.textContent = emojiFor(key, state[key]);
    emojiEls[key] = emoji;

    barWrap.appendChild(track);
    barWrap.appendChild(emoji);
    row.appendChild(barWrap);
    return row;
  }

  function mount() {
    if (root) return;

    root = document.createElement('section');
    root.className = 'companion-status';
    root.setAttribute('aria-label', 'Companion status bars');

    for (const key of ALL_KEYS) root.appendChild(createRow(key));

    document.body.appendChild(root);
    renderAll();
  }

  function tick() {
    if (!applyDecay()) return;
    renderAll();
    syncToBackend();
  }

  function startTicker() {
    stopTicker();
    timerId = window.setInterval(tick, 60 * 1000);
  }

  function stopTicker() {
    if (!timerId) return;
    clearInterval(timerId);
    timerId = 0;
  }

  function setPrimaryStat(key, value) {
    if (!PRIMARY_KEYS.includes(key)) return;
    const next = clampTicks(value);
    if (next === state[key]) return;

    state[key] = next;
    state.health = deriveHealth(state);
    saveState();
    renderAll();
    syncToBackend();
  }

  function incrementPrimary(key, amount = 1) {
    if (!PRIMARY_KEYS.includes(key)) return;
    setPrimaryStat(key, state[key] + amount);
  }

  function markCare(kind) {
    if (kind === 'water') {
      incrementPrimary('thirst', 1);
      return;
    }
    if (kind === 'play') {
      incrementPrimary('happiness', 1);
      return;
    }
    if (kind === 'food') {
      incrementPrimary('hunger', 1);
      return;
    }
    if (kind === 'medicine') {
      for (const key of PRIMARY_KEYS) state[key] = clampTicks(state[key] + 1);
      state.health = deriveHealth(state);
      saveState();
      renderAll();
      syncToBackend();
    }
  }

  function onItemUsed(event) {
    const detail = event.detail || {};
    const category = detail.category || '';
    const sku = detail.sku || '';

    if (category === 'water' || sku.startsWith('water-')) return markCare('water');
    if (category === 'play' || sku.startsWith('play-')) return markCare('play');
    if (category === 'food' || sku.startsWith('food-')) return markCare('food');
    if (category === 'medicine' || sku.startsWith('medicine-')) return markCare('medicine');
  }

  function getAuthToken() {
    return localStorage.getItem('authToken') || localStorage.getItem('token') || '';
  }

  async function loadFromBackend() {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;

      const data = await res.json();
      const remote = data?.companionStatuses;
      if (!remote) return;

      state.happiness = clampTicks(remote.happiness);
      state.thirst = clampTicks(remote.thirst);
      state.hunger = clampTicks(remote.hunger);
      state.health = deriveHealth(state);
      saveState();

      if (applyDecay()) {
        await syncToBackend();
      }
      renderAll();
    } catch (err) {
      console.warn('Status load failed:', err);
    }
  }

  async function syncToBackend() {
    const token = getAuthToken();
    if (!token) return;
    if (syncInFlight) {
      syncQueued = true;
      return;
    }

    syncInFlight = true;
    try {
      const res = await fetch(`${API_BASE}/user/statuses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          happiness: state.happiness,
          thirst: state.thirst,
          hunger: state.hunger
        })
      });

      if (!res.ok) return;
      const data = await res.json();
      const remote = data?.companionStatuses;
      if (!remote) return;

      state.happiness = clampTicks(remote.happiness);
      state.thirst = clampTicks(remote.thirst);
      state.hunger = clampTicks(remote.hunger);
      state.health = deriveHealth(state);
      saveState();
      renderAll();
    } catch (err) {
      console.warn('Status sync failed:', err);
    } finally {
      syncInFlight = false;
      if (syncQueued) {
        syncQueued = false;
        syncToBackend();
      }
    }
  }

  function init() {
    applyDecay();
    mount();
    startTicker();

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tick();
    });
    window.addEventListener('focus', tick);
    window.addEventListener('store:itemUsed', onItemUsed);

    loadFromBackend();
  }

  window.CompanionStatus = {
    init,
    get: () => ({ ...state }),
    set: setPrimaryStat,
    increment: incrementPrimary,
    markCare
  };

  window.addEventListener('DOMContentLoaded', init);
})();

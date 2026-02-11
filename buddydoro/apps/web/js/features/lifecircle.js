// lifecircle.js
// Life Circle widget + client-side decay + backend persistence

(function () {
  const MAX_LIFE = 14;
  const MIN_LIFE = 0;
  const DECAY_INTERVAL_MS = 60 * 1000; // ← test with 60 seconds; production: 6 * 60 * 60 * 1000
  const LOCAL_KEYS = {
    lastCareAt: 'buddyDoro.life.lastCareAtMs',
    lastDecay: 'buddyDoro.life.lastDecayMs'
  };

  let isInitializedFromDB = false;
  let lastAppliedSteps = 0;
  let lastDecayMs = Date.now();
  let $root = null, $img = null;
  let current = null;
  let maxLife = null;
  let size = 120;
  let altPrefix = 'Life';
  let mountedInScene = false;
  let lastCareAtMs = Date.now();
  let tickerId = 0;

  function imgPathFor(value) {
    const base = './assets/artwork/LifeCircle/';
    if (value <= MIN_LIFE) return base + 'LifeZero.png';
    if (value >= maxLife) return base + 'LifeFull.png';
    return base + `Life${value}.png`;
  }

  function preloadAll() {
    const list = [];
    for (let i = 0; i <= MAX_LIFE; i++) list.push(imgPathFor(i));
    list.forEach(src => { const im = new Image(); im.src = src; });
  }

  function render() {
    if (!$img) return;

    const src = imgPathFor(current) + '?t=' + Date.now(); // cache-buster
    console.log('render: setting img src to', src);

    $img.src = src;
    $img.alt = `${altPrefix} ${current} / ${maxLife}`;
    $img.classList.remove('lc-swap');
    void $img.offsetWidth; // force reflow
    $img.classList.add('lc-swap');

    if ($root) {
      $root.setAttribute('data-life', String(current));
      $root.title = `${current} / ${maxLife}`;
    }

    // Extra force repaint
    $root.style.opacity = '0.99';
    void $root.offsetWidth;
    $root.style.opacity = '1';
  }

  function findDragonEl() {
    return document.getElementById('dragon') ||
           document.querySelector('.dragon') ||
           document.querySelector('img[alt*="Dragon" i]') ||
           Array.from(document.images).find(im => /dragon/i.test(im.src)) ||
           null;
  }

  function positionUnderDragon() {
    if (!$root) return;

    const dragon = findDragonEl();
    const scene = document.getElementById('scene') || document.body;
    if (!dragon || !scene) return;

    const dRect = dragon.getBoundingClientRect();
    const sRect = scene.getBoundingClientRect();

    const targetX = dRect.left + dRect.width * 0.48;
    const targetY = dRect.bottom - dRect.height * 0.20;

    const left = targetX - sRect.left - size * 0.5;
    const top  = targetY - sRect.top  - size * 0.5;

    $root.style.left = `${Math.round(left)}px`;
    $root.style.top  = `${Math.round(top)}px`;
  }

  function onResize() { positionUnderDragon(); }

  // Decay scheduler
  function computeLifeFromClock(baseValue, lastCareAtMs) {
    const elapsed = Math.max(0, Date.now() - lastCareAtMs);
    const steps = Math.floor(elapsed / DECAY_INTERVAL_MS);
    return Math.max(MIN_LIFE, baseValue - steps);
  }

  function recalcFromClock() {
  console.log('recalcFromClock running — current time:', new Date().toISOString());

  if (current === null || maxLife === null) {
    console.log('recalc skipped — life values not initialized yet');
    return;
  }

  const now = Date.now();
  const elapsed = now - lastActiveMs;
  const totalSteps = Math.floor(elapsed / DECAY_INTERVAL_MS);

  if (totalSteps > 0) {
    console.log(`Applying ${totalSteps} decay steps at once (offline catch-up)`);

    current = Math.max(MIN_LIFE, current - totalSteps);

    // Reset to now after catch-up
    lastActiveMs = now;
    localStorage.setItem('buddyDoro.life.lastActiveAtMs', String(lastActiveMs));

    render();
    syncLifeToBackend(current);
  } else {
    console.log('No decay needed yet');
  }
}

  function startTicker() {
    stopTicker();

    if (!isInitializedFromDB) {
      console.log('startTicker: Waiting for DB values before starting decay');
      return;
    }

    console.log('startTicker: Starting decay timer (interval:', DECAY_INTERVAL_MS / 1000, 'seconds)');
    recalcFromClock(); // immediate check
    tickerId = window.setInterval(recalcFromClock, DECAY_INTERVAL_MS); // match decay interval
  }

  function stopTicker() {
    if (tickerId) {
      clearInterval(tickerId);
      tickerId = 0;
    }
  }

  // Backend sync
  async function syncLifeToBackend(newCurrent, resetDecay = false, lastDecayMs) {
    const oldCurrent = current;
    current = Math.max(0, Math.min(maxLife, newCurrent));

    render();

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token');

      const body = { current };
      if (resetDecay) body.resetDecay = true;
      body.lastDecay = new Date(lastDecayMs);

      const res = await fetch('http://localhost:3000/api/user/life', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);

      const data = await res.json();
      current = data.life.current;
      maxLife = data.life.max;
      
      render();
    } catch (err) {
      console.error('Life sync failed:', err);
      current = oldCurrent;
      render();
    }
  }

  const LifeCircle = {
    init(opts = {}) {
      preloadAll();

      size = Number.isFinite(opts.size) ? opts.size : 120;
      altPrefix = typeof opts.altPrefix === 'string' ? opts.altPrefix : 'Life';

      let mountEl = null;
      if (opts.mount) {
        mountEl = typeof opts.mount === 'string' ? document.querySelector(opts.mount) : opts.mount;
      }
      if (!mountEl) {
        const scene = document.getElementById('scene') || document.body;
        mountEl = document.createElement('div');
        scene.appendChild(mountEl);
        mountedInScene = true;
      }

      $root = mountEl;
      $root.classList.add('life-circle');
      $root.style.setProperty('--lc-size', `${size}px`);
      $root.innerHTML = '';

      $img = document.createElement('img');
      $img.className = 'lc-img';
      $img.width = size;
      $img.height = size;
      $img.decoding = 'async';
      $img.loading = 'lazy';
      $root.appendChild($img);

      const storedCare = localStorage.getItem(LOCAL_KEYS.lastCareAt);
      if (storedCare) {
        lastCareAtMs = Number(storedCare);
        console.log('Loaded offline lastCareAtMs from localStorage:', lastCareAtMs);
      }

      render();
      LifeCircle.setBreathing(true);

      if (mountedInScene) {
        $root.style.position = 'absolute';
        positionUnderDragon();
        window.addEventListener('resize', onResize);
        setTimeout(positionUnderDragon, 0);
        window.addEventListener('load', positionUnderDragon);
      }

      // Do NOT start ticker here — wait for setLife/startDecay
    },

    // Called from main.js after /me fetch
    setLife({ current: newCurrent, max: newMax, lastCareAt, lastActiveAt }) {
      if (newCurrent === undefined || newMax === undefined) {
        console.error('setLife called without current/max — using defaults');
        current = MAX_LIFE;
        maxLife = MAX_LIFE;
      } else {
        current = Math.max(0, Math.min(MAX_LIFE, newCurrent));
        maxLife = Math.max(1, Math.min(MAX_LIFE, newMax));
      }

      // Load local timestamps
      const storedActive = localStorage.getItem('buddyDoro.life.lastActiveAtMs');
      const localActiveMs = storedActive ? Number(storedActive) : null;

      // DB timestamp
      const dbActiveMs = lastActiveAt ? new Date(lastActiveAt).getTime() : null;

     // Prefer local if newer (offline session end)
      if (localActiveMs && (!dbActiveMs || localActiveMs > dbActiveMs)) {
        lastActiveMs = localActiveMs;
      } else if (dbActiveMs) {
        lastActiveMs = dbActiveMs;
      } else {
        lastActiveMs = Date.now();
      }

      // On login: reset to now (new session start) — decay only counts offline time since last close
      lastActiveMs = Date.now();
      localStorage.setItem('buddyDoro.life.lastActiveAtMs', String(lastActiveMs));

      console.log('setLife: lastActiveMs reset to now on login:', new Date(lastActiveMs).toISOString());

      // lastCareAt logic remains for healing reset
      // ... your existing lastCareAt logic ...

      lastAppliedSteps = 0;

      isInitializedFromDB = true;
      console.log('setLife: DB values loaded, decay can start now');

      // Immediate catch-up from lastActiveMs (offline time since close)
      recalcFromClock();

      render();
    },

    get() {
      return { current, max: maxLife };
    },

    increment(delta) {
      syncLifeToBackend(current + delta);
    },

    setBreathing(on = true) {
      if (!$root) return;
      $root.classList.toggle('is-breathing', !!on);
    },

    markCare(kind = 'care', heal = true) {
      console.log('Care given:', kind);
      lastCareAtMs = Date.now();
      lastAppliedSteps = 0;
      localStorage.setItem(LOCAL_KEYS.lastCareAt, String(lastCareAtMs));
      const newCurrent = heal && current < maxLife ? current + 1 : current;
      syncLifeToBackend(newCurrent, true);
    },

    render() {
      render(); // calls internal render
    },

    startDecay() {
      if (current === null || maxLife === null) {
        console.warn('startDecay: Cannot start — life values not set yet');
        return;
      }
      console.log('startDecay: Starting decay timer now that DB values are loaded');
      startTicker();
    }
  };

  window.LifeCircle = LifeCircle;
})();
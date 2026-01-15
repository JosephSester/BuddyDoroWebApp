/* apps/web/js/features/lifecircle.js
 * Life Circle widget + persistence + 6-hour decay unless cared for.
 * Public API (global):
 *   LifeCircle.init({ initial?: number, size?: number, altPrefix?: string, mount?: selector|HTMLElement })
 *   LifeCircle.set(n)         // force set 0..14
 *   LifeCircle.get()          // read current (0..14)
 *   LifeCircle.increment(d)   // +/- delta, clamped
 *   LifeCircle.markCare(kind) // 'food' | 'water' | 'medicine' etc.; resets decay clock and restores +1 (optional)
 */

(function () {
  // ------------------------------
  // Config
  // ------------------------------
  const MAX_LIFE = 14;
  const MIN_LIFE = 0;
  const DECAY_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
  const STORAGE_KEYS = {
    value: 'life.value',
    lastCareAt: 'life.lastCareAt',
  };

  // ------------------------------
  // Utilities
  // ------------------------------
  const clamp = n => Math.max(MIN_LIFE, Math.min(MAX_LIFE, n | 0));

  function imgPathFor(value) {
    const base = './assets/artwork/LifeCircle/';
    if (value <= MIN_LIFE) return base + 'LifeZero.png';
    if (value >= MAX_LIFE) return base + 'LifeFull.png';
    return base + `Life${value}.png`;
  }

  function preloadAll() {
    const list = [imgPathFor(0)];
    for (let i = 1; i < MAX_LIFE; i++) list.push(imgPathFor(i));
    list.push(imgPathFor(MAX_LIFE));
    list.forEach(src => { const im = new Image(); im.src = src; });
  }

  function nowMs() { return Date.now(); }

  function loadState() {
    const rawVal = localStorage.getItem(STORAGE_KEYS.value);
    const rawCare = localStorage.getItem(STORAGE_KEYS.lastCareAt);
    const value = rawVal == null ? MAX_LIFE : clamp(+rawVal);
    const lastCareAt = rawCare == null ? nowMs() : +rawCare;
    return { value, lastCareAt };
  }

  function saveState(value, lastCareAt) {
    localStorage.setItem(STORAGE_KEYS.value, String(clamp(value)));
    localStorage.setItem(STORAGE_KEYS.lastCareAt, String(lastCareAt));
  }

  // Given lastCareAt and base life, compute what life *should* be now
  function computeLifeFromClock(baseValue, lastCareAt) {
    const elapsed = Math.max(0, nowMs() - lastCareAt);
    const steps = Math.floor(elapsed / DECAY_INTERVAL_MS); // 0,1,2...
    return clamp(baseValue - steps);
  }

  // ------------------------------
  // DOM + placement
  // ------------------------------
  let $root = null, $img = null;
  let current = MAX_LIFE, size = 120, altPrefix = 'Life';
  let mountedInScene = false;
  let lastCareAtMs = nowMs();
  let tickerId = 0;

  function render() {
    if (!$img) return;
    const src = imgPathFor(current);
    $img.src = src;
    $img.alt = `${altPrefix} ${current} / ${MAX_LIFE}`;
    $img.classList.remove('lc-swap'); void $img.offsetWidth; $img.classList.add('lc-swap');
    if ($root) $root.setAttribute('data-life', String(current));
    $root && ($root.title = `${current} / ${MAX_LIFE}`);
  }

  function findDragonEl() {
    return (
      document.getElementById('dragon') ||
      document.querySelector('.dragon') ||
      document.querySelector('img[alt*="Dragon" i]') ||
      Array.from(document.images).find(im => /dragon/i.test(im.src)) ||
      null
    );
  }

  // Position under dragon (you tuned to 0.48 X and 0.20 Y)
  function positionUnderDragon() {
    if (!$root) return;

    const dragon = findDragonEl();
    const scene = document.getElementById('scene') || document.body;
    if (!dragon || !scene) return;

    const dRect = dragon.getBoundingClientRect();
    const sRect = scene.getBoundingClientRect();

    const targetX = dRect.left + dRect.width * 0.48;   // horizontal bias
    const targetY = dRect.bottom - dRect.height * 0.20; // vertical raise

    const left = targetX - sRect.left - size * 0.5;
    const top  = targetY - sRect.top  - size * 0.5;

    $root.style.left = `${Math.round(left)}px`;
    $root.style.top  = `${Math.round(top)}px`;
  }

  function onResize() { positionUnderDragon(); }

  // ------------------------------
  // Decay scheduler
  // ------------------------------
  function recalcFromClock() {
    // Recompute expected life from lastCareAt
    const expected = computeLifeFromClock(MAX_LIFE, lastCareAtMs);
    // Keep whichever is *lower*: expected decay vs locally stored current
    // (prevents "jumping up" unless markCare() is called)
    const next = Math.min(current, expected);
    if (next !== current) {
      current = next;
      saveState(current, lastCareAtMs);
      render();
    }
  }

  function startTicker() {
    stopTicker();
    // Re-check often enough to catch the tick close to real time without wasting CPU.
    // Once per minute is fine.
    tickerId = window.setInterval(recalcFromClock, 60 * 1000);
    // Run once at start, and when tab becomes visible.
    recalcFromClock();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) recalcFromClock();
    });
    window.addEventListener('focus', recalcFromClock);
  }

  function stopTicker() {
    if (tickerId) {
      clearInterval(tickerId);
      tickerId = 0;
    }
  }

  // ------------------------------
  // Public API
  // ------------------------------
  const LifeCircle = {
    init(opts = {}) {
      preloadAll();

      size = Number.isFinite(opts.size) ? opts.size : 120;
      altPrefix = typeof opts.altPrefix === 'string' ? opts.altPrefix : 'Life';

      // mount or auto-create inside #scene
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

      // Load persisted state (or defaults on first run)
      const { value: storedValue, lastCareAt } = loadState();
      lastCareAtMs = lastCareAt;
      const expected = computeLifeFromClock(storedValue, lastCareAtMs);
      current = clamp(expected);

      // If no stored entries existed (first run), ensure full life now.
      if (localStorage.getItem(STORAGE_KEYS.value) == null) {
        current = MAX_LIFE;
        lastCareAtMs = nowMs();
        saveState(current, lastCareAtMs);
      }

      render();
      LifeCircle.setBreathing(true); // enable gentle breathing loop

      if (mountedInScene) {
        $root.style.position = 'absolute';
        positionUnderDragon();
        window.addEventListener('resize', onResize);
        setTimeout(positionUnderDragon, 0);
        window.addEventListener('load', positionUnderDragon);
      }

      startTicker();
    },

    set(n) {
      const next = clamp(n);
      if (next === current) return;
      current = next;
      saveState(current, lastCareAtMs);
      render();
    },

    get() { return current; },

    increment(delta) {
      const d = typeof delta === 'number' ? delta : 1;
      LifeCircle.set(current + d);
    },

    /** Turn breathing animation on/off */
    setBreathing(on = true) {
    if (!$root) return;
    $root.classList.toggle('is-breathing', !!on);
    },


    // Log care, reset decay clock, and (optionally) heal +1.
    // Pass a kind string if you want to audit later; unused here but kept for clarity.
    markCare(kind = 'care', heal = true) {
      lastCareAtMs = nowMs();
      if (heal && current < MAX_LIFE) current = current + 1;
      current = clamp(current);
      saveState(current, lastCareAtMs);
      render();
    }
  };

  window.LifeCircle = LifeCircle;
})();

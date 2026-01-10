/* apps/web/js/features/rain.js
 * Canvas rain overlay with simple wind + intensity controls + random daily scheduler.
 * Public API (global window.Rain):
 *   Rain.init({ mount?: '#scene', density?: 0.65, speed?: 1.0, wind?: 0.6 })
 *   Rain.start()
 *   Rain.stop()
 *   Rain.setIntensity(0..1.5)
 *   Rain.setWind(-1..+1)
 *   Rain.enableRandomDaily({ timesPerDay?:10, durationMs?:5*60*1000, checkEveryMs?:15000, activeHours?:[0,24] })
 */

(function () {
  let canvas, ctx, running = false, drops = [];
  let density = 0.65;   // 0..1.5 (more = more drops)
  let baseSpeed = 1.0;  // overall speed multiplier
  let wind = 0.6;       // -1..+1, negative = blow left
  let DPR = 1;

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); // cap DPR for perf
    canvas.width = Math.round(width * DPR);
    canvas.height = Math.round(height * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    spawnDrops(); // respawn to fill new area
  }

  function spawnDrops() {
    const area = canvas.clientWidth * canvas.clientHeight;
    const targetCount = Math.round((area / 8000) * density); // heuristic
    drops = new Array(targetCount).fill(0).map(() => makeDrop(true));
  }

  function makeDrop(randomY = false) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const len = rand(8, 18);
    const speed = rand(1.2, 2.4) * baseSpeed;
    const x = rand(-w * 0.15, w * 1.15);
    const y = randomY ? rand(-h, h) : -len;
    const thickness = rand(0.8, 1.4);
    return { x, y, len, speed, thickness };
  }

  function step(dt) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const g = 520 * dt; // gravity-like fall scaled by dt
    const wx = wind * 420 * dt;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineCap = 'round';

    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.x += wx + rand(-6, 6) * dt;          // wind + tiny jitter
      d.y += d.speed * g;                     // fall
      const x2 = d.x + wind * d.len * 0.6;   // slanted tail
      const y2 = d.y + d.len;

      ctx.lineWidth = d.thickness;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (d.y - d.len > h || d.x < -40 || d.x > w + 40) {
        drops[i] = makeDrop(false);
      }
    }
  }

  let lastT = 0;
  function loop(t) {
    if (!running) return;
    const now = t || performance.now();
    const dt = Math.min(0.045, (now - lastT) / 1000 || 0.016);
    lastT = now;
    step(dt);
    requestAnimationFrame(loop);
  }

  const Rain = {
    init(opts = {}) {
      const mount =
        typeof opts.mount === 'string'
          ? document.querySelector(opts.mount)
          : (opts.mount || document.getElementById('scene') || document.body);

      if (!mount) return console.warn('[Rain] mount element not found.');
      density = Number.isFinite(opts.density) ? opts.density : density;
      baseSpeed = Number.isFinite(opts.speed) ? opts.speed : baseSpeed;
      wind = Number.isFinite(opts.wind) ? opts.wind : wind;

      canvas = document.createElement('canvas');
      canvas.className = 'rain-layer';
      // position within mount
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      mount.style.position = mount === document.body ? 'relative' : (getComputedStyle(mount).position || 'relative');
      mount.appendChild(canvas);

      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize, { passive: true });
    },

    start() {
      if (running) return;
      running = true;
      lastT = performance.now();
      requestAnimationFrame(loop);
    },

    stop() {
      running = false;
      if (ctx) ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    },

    setIntensity(v) {
      density = Math.max(0, Math.min(1.5, v));
      spawnDrops();
    },

    setWind(v) {
      wind = Math.max(-1, Math.min(1, v));
    },

    /**
     * Enable ~N random rain windows per day. Persists a fresh schedule each day.
     * Options:
     *  - timesPerDay   (int)    e.g., 10
     *  - durationMs    (int)    e.g., 5 * 60 * 1000
     *  - checkEveryMs  (int)    default 15000
     *  - activeHours   [startHour, endHour]  // e.g., [8, 22] for 8am–10pm
     */
    enableRandomDaily(opts = {}) {
      const timesPerDay  = Math.max(1, (opts.timesPerDay | 0) || 10);
      const durationMs   = Math.max(10_000, (opts.durationMs | 0) || (5 * 60 * 1000));
      const checkEveryMs = Math.max(5_000, (opts.checkEveryMs | 0) || 15_000);
      const activeHours  = Array.isArray(opts.activeHours) && opts.activeHours.length === 2
        ? [Math.max(0, Math.min(23, opts.activeHours[0] | 0)),
           Math.max(1, Math.min(24, opts.activeHours[1] | 0))]
        : [0, 24];

      const STORAGE_KEY = 'rain.dailySchedule.v1';

      // Helpers
      const todayKey = () => {
        const d = new Date();
        // YYYY-MM-DD (local)
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      };
      const minutesSinceMidnight = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

      function loadSchedule() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      }

      function saveSchedule(sched) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sched)); } catch {}
      }

      function randomScheduleForToday() {
        const key = todayKey();
        const [startHour, endHour] = activeHours;
        const startMin = startHour * 60;
        const endMin   = endHour  * 60;
        const span = Math.max(1, endMin - startMin);

        // pick random (simple, may cluster slightly; good enough for flavor)
        const starts = [];
        const slotMin = Math.max(1, Math.ceil(durationMs / 60000));
        for (let i = 0; i < timesPerDay; i++) {
          const m = startMin + Math.floor(Math.random() * Math.max(1, span - slotMin));
          starts.push(m);
        }
        starts.sort((a,b)=>a-b);

        const events = starts.map(m => ({
          startMin: m,
          endMin: m + slotMin
        }));

        return { date: key, events };
      }

      function ensureTodaySchedule() {
        const key = todayKey();
        let sched = loadSchedule();
        if (!sched || sched.date !== key) {
          sched = randomScheduleForToday();
          saveSchedule(sched);
        }
        return sched;
      }

      // State for auto driver so we don’t clobber manual use
      let driverTimer = null;
      let autoOn = false;

      const inAnyWindow = (sched, nowMin) =>
        sched.events.some(ev => nowMin >= ev.startMin && nowMin < ev.endMin);

      const drive = () => {
        const sched = ensureTodaySchedule();
        const nowMin = minutesSinceMidnight();
        const shouldRain = inAnyWindow(sched, nowMin);

        if (shouldRain && !autoOn) {
          Rain.start();
          autoOn = true;
        } else if (!shouldRain && autoOn) {
          Rain.stop();
          autoOn = false;
        }
      };

      // Kick off and poll
      drive();
      if (driverTimer) clearInterval(driverTimer);
      driverTimer = setInterval(drive, checkEveryMs);

      // Recheck when tab returns / focus changes
      document.addEventListener('visibilitychange', () => { if (!document.hidden) drive(); });
      window.addEventListener('focus', drive);

      // Optional midnight refresh safeguard (once an hour to roll schedule)
      setInterval(() => { ensureTodaySchedule(); }, 60 * 60 * 1000);
    }
  };

  window.Rain = Rain;
})();

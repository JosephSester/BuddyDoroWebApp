/* apps/web/js/features/backgroundnight.js
   Automatically switches between BackgroundDay.jpg and BackgroundNight.png
   based on local browser time (8pm–6:59am = night, 7am–7:59pm = day).
*/

(function () {
  const ASSET_BASE = './assets/artwork/';      // works with current project structure
  const DAY_BG     = 'BackgroundDay.jpg';
  const NIGHT_BG   = 'BackgroundNight.png';

  // Lightweight preloader so first swap is instant
  function preload(srcs = []) {
    srcs.forEach(src => { const img = new Image(); img.src = src; });
  }
  preload([ASSET_BASE + DAY_BG, ASSET_BASE + NIGHT_BG]);

  function setBackground(filename) {
    const el = document.getElementById('scene');
    if (!el) return;
    el.style.backgroundImage = `url("${ASSET_BASE}${filename}")`;

  }

  // Decide which background should be active right now
  function pickBackgroundFor(now = new Date()) {
    const hour = now.getHours(); // local time
    // Night from 20:00 (inclusive) to 06:59 (hour < 7)
    const isNight = (hour >= 20 || hour < 7);
    return isNight ? NIGHT_BG : DAY_BG;
  }

  // Apply immediately
  function apply() {
    setBackground(pickBackgroundFor());
  }

  // Keep it fresh; check every 5 minutes (cheap)
  function start() {
    apply();
    // Re-apply at the next minute boundary, then every 5 minutes
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(() => {
      apply();
      setInterval(apply, 5 * 60 * 1000);
    }, Math.max(0, msToNextMinute));
  }

  // Expose tiny API if you want to force a refresh from console: BackgroundNight.apply()
  window.BackgroundNight = { apply, start, pickBackgroundFor };

  // Kick off after DOM is ready
  window.addEventListener('DOMContentLoaded', start);
})();

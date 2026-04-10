/* apps/web/js/features/backgroundnight.js
   Switches to the night version of whatever background the user has equipped.
   Night hours: 8pm–6:59am. Checks every 5 minutes and on storage changes.
*/

(function () {
  const ASSET_BASE = './assets/artwork/';
  const BG_KEY     = 'buddydoro.background';

  function setBackground(filename) {
    const el = document.getElementById('scene');
    if (!el) return;
    el.style.background = `url("${ASSET_BASE}${filename}") center bottom / cover no-repeat`;
  }

  function preload(filename) {
    const img = new Image();
    img.src = ASSET_BASE + filename;
  }

  // Given a day path, return the matching night path (or null if none exists).
  // Handles: BackgroundDay.jpg → BackgroundNight.png  and  XxxDay.png → XxxNight.png
  function getNightPath(dayPath) {
    if (dayPath.includes('BackgroundDay.jpg')) {
      return dayPath.replace('BackgroundDay.jpg', 'BackgroundNight.png');
    }
    if (dayPath.includes('Day.png')) {
      return dayPath.replace('Day.png', 'Night.png');
    }
    return null; // No night variant (Moon, InnerEarth, DessertLand, etc.)
  }

  function isNight(now = new Date()) {
    const h = now.getHours();
    return h >= 20 || h < 7;
  }

  function apply() {
    const stored = localStorage.getItem(BG_KEY);
    const night  = isNight();

    if (stored) {
      if (night) {
        const nightPath = getNightPath(stored);
        if (nightPath) {
          preload(nightPath);
          setBackground(nightPath);
          return;
        }
      }
      setBackground(stored);
      return;
    }

    // No background in storage — use the hardcoded default pair
    setBackground(night ? 'BackgroundNight.png' : 'BackgroundDay.jpg');
  }

  function start() {
    apply();
    const now            = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(() => {
      apply();
      setInterval(apply, 5 * 60 * 1000);
    }, Math.max(0, msToNextMinute));
  }

  // Re-apply immediately when the user equips a different background in the store
  window.addEventListener('storage', (e) => {
    if (e.key === BG_KEY) apply();
  });

  window.BackgroundNight = { apply, start, isNight };
  window.addEventListener('DOMContentLoaded', start);
})();

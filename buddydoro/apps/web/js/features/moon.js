/* Moon overlay for BuddyDoro
   - Creates #moon element inside #scene
   - Shows at night (20:00–06:59), hides during day
   - Checks every 5 minutes to keep in sync with the background switch
*/

(function () {
  const isNightNow = () => {
    const h = new Date().getHours();
    return (h >= 20 || h < 7);
  };

  function ensureMoonElement() {
    const scene = document.getElementById('scene');
    if (!scene) return null;

    let moon = document.getElementById('moon');
    if (!moon) {
      moon = document.createElement('div');
      moon.id = 'moon';
      moon.setAttribute('aria-hidden', 'true');
      scene.appendChild(moon);
    }
    return moon;
  }

  function applyVisibility() {
    const moon = ensureMoonElement();
    if (!moon) return;
    if (isNightNow()) {
      moon.classList.add('moon--visible');
    } else {
      moon.classList.remove('moon--visible');
    }
  }

  function start() {
    // initial draw
    applyVisibility();

    // align to next minute, then poll every 5 minutes (cheap + consistent)
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(() => {
      applyVisibility();
      setInterval(applyVisibility, 5 * 60 * 1000);
    }, Math.max(0, msToNextMinute));
  }

  window.Moon = { applyVisibility, start };
  window.addEventListener('DOMContentLoaded', start);
})();

// Greeting chip + Doros balance display
let USER_NAME = 'Joe';
let dorosBalance = 1250;

let greetTextEl, dorosAmountEl, greetChip, greetMenu;
let openStoreCb = null;

function paintDoros() { if (dorosAmountEl) dorosAmountEl.textContent = dorosBalance.toLocaleString(); }

let greetMenuOpen = false, greetCleanup = [];

function openGreetMenu() {
  if (!greetChip || !greetMenu || greetMenuOpen) return;
  greetMenuOpen = true; greetMenu.hidden = false; greetChip.setAttribute('aria-expanded', 'true');

  const onPointerDown = (evt) => {
    if (evt.target instanceof Node && (greetMenu.contains(evt.target) || evt.target === greetChip)) return;
    closeGreetMenu({ focusTrigger: false });
  };
  const onKeyDown = (evt) => { if (evt.key === 'Escape') { evt.preventDefault(); closeGreetMenu({ focusTrigger: true }); } };

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  greetCleanup = [() => document.removeEventListener('pointerdown', onPointerDown, true),
  () => document.removeEventListener('keydown', onKeyDown, true)];
}
function closeGreetMenu({ focusTrigger = true } = {}) {
  if (!greetMenu || !greetMenuOpen) return;
  greetMenuOpen = false; greetMenu.hidden = true; greetChip?.setAttribute('aria-expanded', 'false');
  greetCleanup.forEach(fn => { try { fn(); } catch { } }); greetCleanup = [];
  if (focusTrigger && greetChip) { greetChip.focus({ preventScroll: true }); }
}
function toggleGreetMenu() { greetMenuOpen ? closeGreetMenu() : openGreetMenu(); }

export function spendDoros(amount) {
  dorosBalance = Math.max(0, dorosBalance - Math.max(0, amount | 0));
  paintDoros();
}
export function getDoros() { return dorosBalance; }
export function addDoros(amount) { dorosBalance += Math.max(0, amount | 0); paintDoros(); }

export function initTopbar({ userName = 'Joe', onOpenStore } = {}) {
  USER_NAME = userName;
  openStoreCb = onOpenStore || null;

  greetTextEl = document.getElementById('greetText');
  dorosAmountEl = document.getElementById('dorosAmount');

  greetChip = document.getElementById('greetChip');
  greetMenu = document.getElementById('greetMenu');

  if (greetTextEl) greetTextEl.textContent = `Hello, ${USER_NAME}`;
  paintDoros();

  greetChip?.addEventListener('click', toggleGreetMenu);

  // Doros dropdown → "Buy Doros"
  const dorosChipBtn = document.getElementById('dorosChip');
  const dorosMenuEl = document.getElementById('dorosMenu');
  const dropdown = dorosChipBtn ? dorosChipBtn.closest('.doros-dropdown') : null;
  let open = false; let cleaners = [];
  function openMenu() {
    if (!dorosChipBtn || !dorosMenuEl || open) return;
    open = true; dorosChipBtn.setAttribute('aria-expanded', 'true');
    if (dropdown) dropdown.setAttribute('data-open', 'true');
    dorosMenuEl.hidden = false;
    const down = e => { if (dropdown && e.target instanceof Node && dropdown.contains(e.target)) return; closeMenu(); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); closeMenu({ focusChip: true }); } };
    const focusin = e => { if (dropdown && e.target instanceof Node && dropdown.contains(e.target)) return; closeMenu(); };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key, true);
    document.addEventListener('focusin', focusin, true);
    cleaners = [() => document.removeEventListener('pointerdown', down, true),
    () => document.removeEventListener('keydown', key, true),
    () => document.removeEventListener('focusin', focusin, true)];
  }
  function closeMenu({ focusChip = false } = {}) {
    if (!dorosChipBtn || !open) return;
    open = false; dorosChipBtn.setAttribute('aria-expanded', 'false');
    if (dropdown) dropdown.removeAttribute('data-open');
    if (dorosMenuEl) dorosMenuEl.hidden = true;
    cleaners.forEach(fn => { try { fn(); } catch { } }); cleaners = [];
    if (focusChip) dorosChipBtn.focus({ preventScroll: true });
  }
  function toggle() { open ? closeMenu() : openMenu(); }

  dorosChipBtn?.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
  dorosChipBtn?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu(); }
    else if (e.key === 'Escape' && open) { e.preventDefault(); closeMenu(); }
  });
  dorosMenuEl?.addEventListener('click', (e) => {
    const item = e.target instanceof Element ? e.target.closest('.doros-menu-item') : null;
    if (!item) return;
    e.preventDefault();
    closeMenu({ focusChip: true });
    if (item.dataset.menuAction === 'buy-doros' && typeof openStoreCb === 'function') openStoreCb();
  });

  return { getDoros, addDoros, spendDoros };
}

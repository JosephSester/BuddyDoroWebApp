// topbar.js
// Greeting chip + Doros balance display + menu logic

let USER_NAME = 'Player';
let dorosBalance = 0;

let greetTextEl, dorosAmountEl, greetChip, greetMenu, menuButton;
let openStoreCb = null;

function paintDoros() {

  if (!dorosAmountEl) {
    console.warn('dorosAmountEl not found — cannot paint Doros');
    return;
  }

  const formatted = dorosBalance.toLocaleString('en-US');
  console.log('Painting Doros:', formatted); // ← debug to confirm it's called
  dorosAmountEl.textContent = formatted;

  dorosAmountEl.style.opacity = '0.99';
  void dorosAmountEl.offsetWidth;           // trigger reflow
  dorosAmountEl.style.opacity = '1';
}

let greetMenuOpen = false;
let greetCleanup = [];
let menuHidden = true;
let timerActive = false;

function setTasksChipRowHidden(hidden) {
  const row = document.querySelector('.tasks-chip-row');
  if (!row) return;
  row.classList.toggle('is-hidden', hidden);
  row.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

function updateTasksChipRowVisibility() {
  const row = document.querySelector('.tasks-chip-row');
  if (row) {
    row.classList.toggle('is-timer-active', timerActive);
  }
  setTasksChipRowHidden(menuHidden || greetMenuOpen);
}

function toggleTasksChipRow() {
  menuHidden = !menuHidden;
  updateTasksChipRowVisibility();
}

function setTimerActiveState(isActive) {
  timerActive = Boolean(isActive);
  updateTasksChipRowVisibility();
}

function openGreetMenu() {
  if (!greetChip || !greetMenu || greetMenuOpen) return;
  greetMenuOpen = true;
  greetMenu.hidden = false;
  greetChip.setAttribute('aria-expanded', 'true');
  updateTasksChipRowVisibility();

  const onPointerDown = (evt) => {
    if (evt.target instanceof Node && (greetMenu.contains(evt.target) || evt.target === greetChip)) return;
    closeGreetMenu({ focusTrigger: false });
  };
  const onKeyDown = (evt) => {
    if (evt.key === 'Escape') {
      evt.preventDefault();
      closeGreetMenu({ focusTrigger: true });
    }
  };

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  greetCleanup = [
    () => document.removeEventListener('pointerdown', onPointerDown, true),
    () => document.removeEventListener('keydown', onKeyDown, true),
  ];
}

function closeGreetMenu({ focusTrigger = true } = {}) {
  if (!greetMenu || !greetMenuOpen) return;
  greetMenuOpen = false;
  greetMenu.hidden = true;
  greetChip?.setAttribute('aria-expanded', 'false');
  greetCleanup.forEach(fn => { try { fn(); } catch { } });
  greetCleanup = [];
  updateTasksChipRowVisibility();
  if (focusTrigger && greetChip) greetChip.focus({ preventScroll: true });
}

function toggleGreetMenu() {
  greetMenuOpen ? closeGreetMenu() : openGreetMenu();
}

export function spendDoros(amount) {
  dorosBalance = Math.max(0, dorosBalance - Math.max(0, amount | 0));
  paintDoros();
}

export function getDoros() {
  return dorosBalance;
}

export function addDoros(amount) {
  dorosBalance += Math.max(0, amount | 0);
  paintDoros();
}

export function setDoros(newBalance) {
  console.log('setDoros CALLED with new value:', newBalance);
  dorosBalance = Math.max(0, Number(newBalance) || 0);
  paintDoros();
}

export function initTopbar({ userName = 'Player', startingDoros = 0, onOpenStore } = {}) {
  USER_NAME = userName;
  dorosBalance = Math.max(0, Number(startingDoros) || 0);

  greetTextEl = document.getElementById('greetText');
  dorosAmountEl = document.getElementById('dorosAmount');
  greetChip = document.getElementById('greetChip');
  greetMenu = document.getElementById('greetMenu');
  menuButton = document.getElementById('menuButton');

  if (greetTextEl) {
    greetTextEl.textContent = `Hello, ${USER_NAME}`;
  }
  paintDoros();

  greetChip?.addEventListener('click', toggleGreetMenu);
  menuButton?.addEventListener('click', toggleTasksChipRow);

  updateTasksChipRowVisibility();

  // Doros dropdown → "Buy Doros"
  const dorosChipBtn = document.getElementById('dorosChip');
  const dorosMenuEl = document.getElementById('dorosMenu');
  const dropdown = dorosChipBtn ? dorosChipBtn.closest('.doros-dropdown') : null;

  let open = false;
  let cleaners = [];

  function openMenu() {
    if (!dorosChipBtn || !dorosMenuEl || open) return;
    open = true;
    dorosChipBtn.setAttribute('aria-expanded', 'true');
    if (dropdown) dropdown.setAttribute('data-open', 'true');
    dorosMenuEl.hidden = false;

    const down = e => {
      if (dropdown && e.target instanceof Node && dropdown.contains(e.target)) return;
      closeMenu();
    };
    const key = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu({ focusChip: true });
      }
    };
    const focusin = e => {
      if (dropdown && e.target instanceof Node && dropdown.contains(e.target)) return;
      closeMenu();
    };

    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key, true);
    document.addEventListener('focusin', focusin, true);

    cleaners = [
      () => document.removeEventListener('pointerdown', down, true),
      () => document.removeEventListener('keydown', key, true),
      () => document.removeEventListener('focusin', focusin, true),
    ];
  }

  function closeMenu({ focusChip = false } = {}) {
    if (!dorosChipBtn || !open) return;
    open = false;
    dorosChipBtn.setAttribute('aria-expanded', 'false');
    if (dropdown) dropdown.removeAttribute('data-open');
    if (dorosMenuEl) dorosMenuEl.hidden = true;
    cleaners.forEach(fn => { try { fn(); } catch { } });
    cleaners = [];
    if (focusChip) dorosChipBtn.focus({ preventScroll: true });
  }

  function toggle() {
    open ? closeMenu() : openMenu();
  }

  dorosChipBtn?.addEventListener('click', e => {
    e.preventDefault();
    toggle();
  });

  dorosChipBtn?.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu();
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      closeMenu();
    }
  });

  dorosMenuEl?.addEventListener('click', e => {
    const item = e.target instanceof Element ? e.target.closest('.doros-menu-item') : null;
    if (!item) return;
    e.preventDefault();
    closeMenu({ focusChip: true });
    if (item.dataset.menuAction === 'buy-doros' && typeof openStoreCb === 'function') {
      openStoreCb();
    }
  });

  // Diamonds dropdown → "Buy Diamonds"
  const diamondChipBtn = document.getElementById('diamondChip');
  const diamondMenuEl = document.getElementById('diamondMenu');
  const diamondDropdown = diamondChipBtn ? diamondChipBtn.closest('.doros-dropdown') : null;

  let diamondOpen = false;
  let diamondCleaners = [];

  function openDiamondMenu() {
    if (!diamondChipBtn || !diamondMenuEl || diamondOpen) return;
    diamondOpen = true;
    diamondChipBtn.setAttribute('aria-expanded', 'true');
    if (diamondDropdown) diamondDropdown.setAttribute('data-open', 'true');
    diamondMenuEl.hidden = false;

    const down = e => {
      if (diamondDropdown && e.target instanceof Node && diamondDropdown.contains(e.target)) return;
      closeDiamondMenu();
    };
    const key = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDiamondMenu({ focusChip: true });
      }
    };
    const focusin = e => {
      if (diamondDropdown && e.target instanceof Node && diamondDropdown.contains(e.target)) return;
      closeDiamondMenu();
    };

    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key, true);
    document.addEventListener('focusin', focusin, true);

    diamondCleaners = [
      () => document.removeEventListener('pointerdown', down, true),
      () => document.removeEventListener('keydown', key, true),
      () => document.removeEventListener('focusin', focusin, true),
    ];
  }

  function closeDiamondMenu({ focusChip = false } = {}) {
    if (!diamondChipBtn || !diamondOpen) return;
    diamondOpen = false;
    diamondChipBtn.setAttribute('aria-expanded', 'false');
    if (diamondDropdown) diamondDropdown.removeAttribute('data-open');
    diamondMenuEl.hidden = true;
    diamondCleaners.forEach(fn => { try { fn(); } catch { } });
    diamondCleaners = [];
    if (focusChip) diamondChipBtn.focus({ preventScroll: true });
  }

  function toggleDiamondMenu() {
    diamondOpen ? closeDiamondMenu() : openDiamondMenu();
  }

  diamondChipBtn?.addEventListener('click', e => {
    e.preventDefault();
    toggleDiamondMenu();
  });

  diamondChipBtn?.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDiamondMenu();
    } else if (e.key === 'Escape' && diamondOpen) {
      e.preventDefault();
      closeDiamondMenu();
    }
  });

  diamondMenuEl?.addEventListener('click', e => {
    const item = e.target instanceof Element ? e.target.closest('.doros-menu-item') : null;
    if (!item) return;
    e.preventDefault();
    closeDiamondMenu({ focusChip: true });
    if (item.dataset.menuAction === 'buy-diamonds' && typeof openStoreCb === 'function') {
      openStoreCb('diamonds');
    }
  });

  return { getDoros, addDoros, spendDoros, setTimerActive: setTimerActiveState, setTimerRunning: setTimerActiveState, setDoros };
}
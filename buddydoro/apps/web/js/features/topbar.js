// topbar.js
// Greeting chip + Doros balance display + menu logic

let USER_NAME = 'Player';
let dorosBalance = 0;

let greetTextEl;
let dorosAmountEl;
let greetChip;
let greetMenu;
let menuButton;
let tasksChipRow;                // ⭐ NEW (cached)

let openStoreCb = null;          // ⭐ UPDATED (will now be assigned)

let greetMenuOpen = false;
let greetCleanup = [];
let menuHidden = true;
let timerActive = false;

/* =========================================================
   ⭐ UPDATED: Clean number coercion helper
========================================================= */
function safeInt(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

/* =========================================================
   ⭐ UPDATED: CSS-based animation instead of inline reflow
   (Add .doros-bump animation in CSS)
========================================================= */
function paintDoros() {
  if (!dorosAmountEl) return;

  const formatted = dorosBalance.toLocaleString('en-US');
  dorosAmountEl.textContent = formatted;

  dorosAmountEl.classList.remove('doros-bump');
  void dorosAmountEl.offsetWidth;
  dorosAmountEl.classList.add('doros-bump');
}

/* =========================================================
   Tasks chip visibility
========================================================= */

function setTasksChipRowHidden(hidden) {
  if (!tasksChipRow) return;
  tasksChipRow.classList.toggle('is-hidden', hidden);
  tasksChipRow.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

function updateTasksChipRowVisibility() {
  if (!tasksChipRow) return;

  tasksChipRow.classList.toggle('is-timer-active', timerActive);
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

/* =========================================================
   Greeting menu
========================================================= */

function openGreetMenu() {
  if (!greetChip || !greetMenu || greetMenuOpen) return;

  greetMenuOpen = true;
  greetMenu.hidden = false;
  greetChip.setAttribute('aria-expanded', 'true');
  updateTasksChipRowVisibility();

  const onPointerDown = evt => {
    if (greetMenu.contains(evt.target) || evt.target === greetChip) return;
    closeGreetMenu({ focusTrigger: false });
  };

  const onKeyDown = evt => {
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
  if (!greetMenuOpen) return;

  greetMenuOpen = false;
  greetMenu.hidden = true;
  greetChip?.setAttribute('aria-expanded', 'false');

  greetCleanup.forEach(fn => fn());
  greetCleanup = [];

  updateTasksChipRowVisibility();

  if (focusTrigger) greetChip?.focus({ preventScroll: true });
}

function toggleGreetMenu() {
  greetMenuOpen ? closeGreetMenu() : openGreetMenu();
}

/* =========================================================
   ⭐ NEW: Generic Dropdown Factory (removes duplication)
========================================================= */

function createDropdown({ triggerId, menuId, onSelect }) {
  const trigger = document.getElementById(triggerId);
  const menu = document.getElementById(menuId);
  const dropdown = trigger?.closest('.doros-dropdown');

  if (!trigger || !menu) return;

  let open = false;
  let cleaners = [];

  function openMenu() {
    if (open) return;
    open = true;

    trigger.setAttribute('aria-expanded', 'true');
    dropdown?.setAttribute('data-open', 'true');
    menu.hidden = false;

    const down = e => {
      if (dropdown.contains(e.target)) return;
      closeMenu();
    };

    const key = e => {
      if (e.key === 'Escape') closeMenu({ focus: true });
    };

    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key, true);

    cleaners = [
      () => document.removeEventListener('pointerdown', down, true),
      () => document.removeEventListener('keydown', key, true),
    ];
  }

  function closeMenu({ focus = false } = {}) {
    if (!open) return;

    open = false;
    trigger.setAttribute('aria-expanded', 'false');
    dropdown?.removeAttribute('data-open');
    menu.hidden = true;

    cleaners.forEach(fn => fn());
    cleaners = [];

    if (focus) trigger.focus({ preventScroll: true });
  }

  trigger.addEventListener('click', e => {
    e.preventDefault();
    open ? closeMenu() : openMenu();
  });

  menu.addEventListener('click', e => {
    const item = e.target.closest('.doros-menu-item');
    if (!item) return;

    e.preventDefault();
    closeMenu({ focus: true });
    onSelect?.(item.dataset.menuAction);
  });
}

/* =========================================================
   Public Doros API
========================================================= */

export function spendDoros(amount) {
  dorosBalance = Math.max(0, dorosBalance - safeInt(amount)); // ⭐ UPDATED
  paintDoros();
}

export function getDoros() {
  return dorosBalance;
}

export function addDoros(amount) {
  dorosBalance += safeInt(amount); // ⭐ UPDATED
  paintDoros();
}

export function setDoros(newBalance) {
  dorosBalance = safeInt(newBalance); // ⭐ UPDATED
  paintDoros();
}

/* =========================================================
   Init
========================================================= */

export function initTopbar({
  userName = 'Player',
  startingDoros = 0,
  onOpenStore
} = {}) {

  USER_NAME = userName;
  dorosBalance = safeInt(startingDoros);
  openStoreCb = onOpenStore;          // ⭐ UPDATED (was missing)

  greetTextEl = document.getElementById('greetText');
  dorosAmountEl = document.getElementById('dorosAmount');
  greetChip = document.getElementById('greetChip');
  greetMenu = document.getElementById('greetMenu');
  menuButton = document.getElementById('menuButton');
  tasksChipRow = document.querySelector('.tasks-chip-row'); // ⭐ NEW

  if (greetTextEl) {
    greetTextEl.textContent = `Hello, ${USER_NAME}`;
  }

  paintDoros();

  greetChip?.addEventListener('click', toggleGreetMenu);
  menuButton?.addEventListener('click', toggleTasksChipRow);

  updateTasksChipRowVisibility();

  /* ⭐ UPDATED: Dropdowns now created via factory */

  createDropdown({
    triggerId: 'dorosChip',
    menuId: 'dorosMenu',
    onSelect: action => {
      if (action === 'buy-doros') openStoreCb?.();
    }
  });

  createDropdown({
    triggerId: 'diamondChip',
    menuId: 'diamondMenu',
    onSelect: action => {
      if (action === 'buy-diamonds') openStoreCb?.('diamonds');
    }
  });

  // Create logout confirmation modal
  function createLogoutModal() {
    // If modal already exists, RETURN it
    const existing = document.getElementById('logoutModal');
    if (existing) return existing;

    const modal = document.createElement('div');
    modal.id = 'logoutModal';
    modal.innerHTML = `
    <div class="logout-overlay" aria-hidden="true"></div>
    <div class="logout-dialog" role="dialog" aria-modal="true" aria-label="Log out confirmation">
      <h3>Log out?</h3>
      <p>Do you want to log out?</p>
      <div class="logout-actions">
        <button type="button" id="confirmLogout" class="bd-btn bd-btn-primary">Log Out</button>
        <button type="button" id="cancelLogout" class="bd-btn bd-btn-secondary">Cancel</button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    // ✅ Return the modal so the caller can querySelector on it
    return modal;
  }

  greetMenu?.addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-nav]');
    const logoutBtn = e.target.closest('#logoutBtn');

    if (!navItem && !logoutBtn) return;

    e.preventDefault();
    closeGreetMenu({ focusTrigger: true });

    if (navItem) {
      const targetPage = navItem.dataset.nav;
      if (targetPage) window.location.href = targetPage;
    }

    if (logoutBtn) {
      const modal = createLogoutModal();

      console.log('logout clicked, modal =', modal);
      console.log('logoutModal in DOM?', document.getElementById('logoutModal'));

      if (!modal) {
        console.error('Logout modal failed to create');
        return;
      }

      const overlay = modal.querySelector('.logout-overlay');
      const dialog = modal.querySelector('.logout-dialog');
      const confirmBtn = modal.querySelector('#confirmLogout');
      const cancelBtn = modal.querySelector('#cancelLogout');

      // Confirm logout
      confirmBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.href = './login.html';
      }, {once: true});

      // Cancel → back to index
      cancelBtn.addEventListener('click', () => {
        modal.remove();
        window.location.href = './index.html';
      }, {once: true});

      // Click outside dialog (overlay) → back to index
      overlay.addEventListener('click', () => {
        modal.remove();
        window.location.href = './index.html';
      });

      // Clicking inside dialog does nothing
      dialog.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  });

  return {
    getDoros,
    addDoros,
    spendDoros,
    setDoros,
    setTimerActive: setTimerActiveState,
    setTimerRunning: setTimerActiveState
  };
}
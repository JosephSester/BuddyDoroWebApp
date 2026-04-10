// apps/web/js/features/sidebar.js

export function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const menuBtn  = document.getElementById('menuButton');
  const closeBtn = document.getElementById('sidebarCloseBtn');

  const sidebarUsernameEl = document.getElementById('sidebarUsername');
  const sidebarDorosEl    = document.getElementById('sidebarDoros');
  const sidebarDiamsEl    = document.getElementById('sidebarDiamonds');

  function getTimeGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning,';
    if (h < 18) return 'Good afternoon,';
    return 'Good evening,';
  }

  function syncProfile() {
    const greetEl   = document.getElementById('greetText');
    const dorosEl   = document.getElementById('dorosAmount');
    const diamondEl = document.getElementById('diamondAmount');

    const sidebarGreetingEl = document.getElementById('sidebarGreeting');
    if (sidebarGreetingEl) sidebarGreetingEl.textContent = getTimeGreeting();

    if (sidebarUsernameEl && greetEl) {
      sidebarUsernameEl.textContent =
        (greetEl.textContent || '').replace(/^Hello,\s*/i, '').trim() || 'Player';
    }
    if (sidebarDorosEl && dorosEl) {
      sidebarDorosEl.textContent = dorosEl.textContent || '0';
    }
    if (sidebarDiamsEl && diamondEl) {
      sidebarDiamsEl.textContent = diamondEl.textContent || '0';
    }
  }

  function open() {
    syncProfile();
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-open');
  }

  function close() {
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('is-open');
  }

  menuBtn?.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? close() : open();
  });

  closeBtn?.addEventListener('click', close);

  // Escape key closes sidebar
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) close();
  });

  // Proxy nav buttons → existing chips / action buttons
  // "Add Goal" — triggers panel creation directly, no dialog open
  document.getElementById('sidebarTasksBtn')?.addEventListener('click', () => {
    document.getElementById('todoCreateTask')?.click();
  });

  // History navigates to standalone page
  document.getElementById('sidebarHistoryBtn')?.addEventListener('click', () => {
    close();
    setTimeout(() => { window.location.href = 'history.html'; }, 180);
  });

  document.getElementById('sidebarAiPlanBtn')?.addEventListener('click', () => {
    close();
    setTimeout(() => { window.location.href = 'aiplan.html'; }, 180);
  });

  document.getElementById('sidebarMusicBtn')?.addEventListener('click', () => {
    close();
    setTimeout(() => document.getElementById('musicChip')?.click(), 180);
  });

  // Page navigation buttons
  sidebar.querySelectorAll('[data-sidebar-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = btn.dataset.sidebarNav;
    });
  });

  // Logout
  document.getElementById('sidebarLogoutBtn')?.addEventListener('click', () => {
    close();
    localStorage.removeItem('authToken');
    localStorage.removeItem('hasSeenOnboarding');
    window.location.href = 'login.html';
  });

  // Block task card selection inside the sidebar, but allow interactive buttons through
  document.getElementById('tasksStack')?.addEventListener('click', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    if (card.classList.contains('task-create')) return; // allow create-form save/cancel through
    if (e.target.closest('.task-del')) return;          // allow task delete button
    if (e.target.closest('.subtask-toggle')) return;    // allow subtask toggle / add
    if (e.target.closest('.subtasks-container')) return; // allow all subtask interactions
    e.stopPropagation();
  }, true); // capture phase — runs before card's own handlers

  // Goals accordion — toggle expand/collapse on header click
  document.getElementById('tasksStack')?.addEventListener('click', e => {
    const header = e.target.closest('.tasks-header');
    if (!header) return;
    // Don't interfere with edit/delete action buttons
    if (e.target.closest('.tasks-header-actions')) return;
    const panel = header.closest('.tasks-panel');
    if (panel) panel.classList.toggle('is-expanded');
  });

  // Subtask "+" — reset container.hidden=true before each click so the
  // toggle always opens the editor (it only fires onAddSubtask when opening).
  document.getElementById('tasksStack')?.addEventListener('click', e => {
    const toggle = e.target.closest('.subtask-toggle');
    if (!toggle) return;
    const container = toggle.closest('.task-card')?.querySelector('.subtasks-container');
    if (container) container.hidden = true;
  }, true); // capture phase — runs before the button's own handler
}

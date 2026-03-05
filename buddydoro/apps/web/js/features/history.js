// history.js — History dialog open/close and tab switching

document.addEventListener('DOMContentLoaded', function () {
  const chip    = document.getElementById('historyChip');
  const dialog  = document.getElementById('historyDialog');
  const backdrop = document.getElementById('historyBackdrop');
  const closeTop    = document.getElementById('historyClose');
  const closeBottom = document.getElementById('historyCloseBottom');
  const content = document.getElementById('historyContent');
  const tabs    = Array.from(document.querySelectorAll('#historyDialog .tab'));

  if (!chip || !dialog || !backdrop) return;

  // --- Open / Close ---

  function openHistory() {
    dialog.hidden = false;
    backdrop.hidden = false;
    dialog.removeAttribute('aria-hidden');
    closeTop.focus({ preventScroll: true });
  }

  function closeHistory() {
    dialog.hidden = true;
    backdrop.hidden = true;
    dialog.setAttribute('aria-hidden', 'true');
    chip.focus({ preventScroll: true });
  }

  chip.addEventListener('click', openHistory);
  backdrop.addEventListener('click', closeHistory);
  closeTop.addEventListener('click', closeHistory);
  closeBottom.addEventListener('click', closeHistory);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dialog.hidden) closeHistory();
  });

  // --- Tab switching ---

  function showPeriod(period) {
    // Update tab active state
    tabs.forEach(tab => {
      const active = tab.dataset.period === period;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    // Render content (placeholder — replace with real data when available)
    content.innerHTML = `<p class="history-empty">No ${period} history yet.</p>`;
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => showPeriod(tab.dataset.period));
  });
});

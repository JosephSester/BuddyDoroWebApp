// history.js — History dialog: open/close, tab switching, and data rendering.

import {
    loadAllSessions,
    filterByPeriod,
    buildBars,
    buildSubtaskTotals,
    fmtDuration,
} from './historyStorage.js';

const chip        = document.getElementById('historyChip');
const dialog      = document.getElementById('historyDialog');
const backdrop    = document.getElementById('historyBackdrop');
const closeTop    = document.getElementById('historyClose');
const closeBottom = document.getElementById('historyCloseBottom');
const content     = document.getElementById('historyContent');
const tabs        = Array.from(document.querySelectorAll('#historyDialog .tab'));

if (chip && dialog && backdrop) {

    // ── Open / Close ────────────────────────────────────────────────────────

    function openHistory() {
        dialog.hidden = false;
        backdrop.hidden = false;
        dialog.removeAttribute('aria-hidden');
        showPeriod(currentPeriod);
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
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !dialog.hidden) closeHistory();
    });

    // ── Tab switching ───────────────────────────────────────────────────────

    let currentPeriod = 'daily';

    function showPeriod(period) {
        currentPeriod = period;
        tabs.forEach(tab => {
            const active = tab.dataset.period === period;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', String(active));
        });
        renderHistory(period);
    }

    tabs.forEach(tab => tab.addEventListener('click', () => showPeriod(tab.dataset.period)));

    // ── Rendering ───────────────────────────────────────────────────────────

    function renderHistory(period) {
        const filtered      = filterByPeriod(loadAllSessions(), period);
        const bars          = buildBars(filtered, period);
        const subtaskTotals = buildSubtaskTotals(filtered);
        const totalSeconds  = filtered.reduce((s, r) => s + r.seconds, 0);
        const sessionCount  = filtered.length;
        const periodLabel   = period.charAt(0).toUpperCase() + period.slice(1);

        if (filtered.length === 0) {
            content.innerHTML = `<p class="history-empty">No ${period} history yet.<br>Complete a timed session to see it here.</p>`;
            return;
        }

        const maxSeconds = Math.max(...bars.map(b => b.seconds), 1);
        const topHours   = Math.ceil(maxSeconds / 3600) || 1;
        const midHours   = Math.ceil(topHours / 2);

        // Current bar highlight index
        const now = new Date();
        const currentIdx = {
            daily:   now.getHours(),
            weekly:  (now.getDay() + 6) % 7,
            monthly: now.getDate() - 1,
            yearly:  now.getMonth(),
        }[period] ?? -1;

        const barsHtml = bars.map((b, i) => {
            const pct       = Math.round((b.seconds / maxSeconds) * 100);
            const isCurrent = i === currentIdx;
            const tip       = b.seconds > 0 ? fmtDuration(b.seconds) : '0m';
            return `
                <div class="hbar-col">
                  <div class="hbar-bar-wrap">
                    <div class="hbar-bar${isCurrent ? ' hbar-bar--current' : ''}"
                         style="height:${pct}%"
                         title="${tip}"></div>
                  </div>
                  <div class="hbar-label">${b.label}</div>
                </div>`;
        }).join('');

        const listHtml = subtaskTotals.map(s => `
            <div class="hist-row">
              <span class="hist-row-name">${esc(s.name)}</span>
              <span class="hist-row-time">${fmtDuration(s.seconds)}</span>
            </div>`).join('');

        content.innerHTML = `
          <div class="hist-layout">

            <div class="hist-left">
              <div class="hist-chart-title">
                <span>&#9201;</span> Total Focus Time This ${periodLabel}
              </div>
              <div class="hist-total-big">${fmtDuration(totalSeconds)}</div>

              <div class="hist-chart">
                <div class="hist-yaxis">
                  <span>${topHours}h</span>
                  <span>${midHours}h</span>
                  <span>0</span>
                </div>
                <div class="hist-bars">${barsHtml}</div>
              </div>

              <div class="hist-session-count">
                Sessions This ${periodLabel}: <strong>${sessionCount}</strong>
              </div>
            </div>

            <div class="hist-right">
              <div class="hist-list-title">Time Spent by Subtask</div>
              <div class="hist-list">${listHtml}</div>
              <div class="hist-list-total">
                Total: <strong>${fmtDuration(totalSeconds)}</strong>
              </div>
            </div>

          </div>`;
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

import { getElements } from './dom.js';
import { initDiscoverTab, triggerSearch } from './discoverTab.js';
import { initSavedTab, refreshSavedTab } from './savedTab.js';
import { initNotesTab, refreshNotesTab } from './notesTab.js';

export function initResources({ getActiveTask, getTasks } = {}) {
    const el = getElements();
    if (!el.dialog) return;

    // ── Tab switching ─────────────────────────────────────────────────────────
    let activeTab = 'discover';

    function switchTab(tabKey) {
        activeTab = tabKey;
        el.tabs.forEach(btn => {
            const isActive = btn.dataset.resourcesTab === tabKey;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        el.panelDiscover.hidden = tabKey !== 'discover';
        el.panelSaved.hidden    = tabKey !== 'saved';
        el.panelNotes.hidden    = tabKey !== 'notes';

        if (tabKey === 'saved') refreshSavedTab();
        if (tabKey === 'notes') refreshNotesTab();
    }

    el.tabs.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.resourcesTab));
    });

    // ── Search ────────────────────────────────────────────────────────────────
    function getSearchSuggestion() {
        const task = getActiveTask?.();
        if (task?.name || task?.text) return task.name || task.text;
        const panelTitle = document.querySelector('.tasks-title, .panel-title, .tasks-panel h2');
        return panelTitle?.textContent?.trim() || '';
    }

    function runSearch() {
        const q = el.searchInput.value.trim();
        if (!q) return;
        switchTab('discover');
        triggerSearch(q);
    }

    el.searchBtn.addEventListener('click', runSearch);
    el.searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') runSearch();
    });
    el.searchInput.addEventListener('input', () => {
        if (activeTab === 'discover') triggerSearch(el.searchInput.value);
    });

    // ── Open / close ──────────────────────────────────────────────────────────
    function open() {
        if (!el.dialog.hidden) return;
        el.backdrop.hidden = false;
        el.dialog.hidden   = false;
        el.chip.setAttribute('aria-expanded', 'true');
        document.addEventListener('keydown', onKeyDown);

        const suggestion = getSearchSuggestion();
        if (suggestion && !el.searchInput.value) {
            el.searchInput.value = suggestion;
        }

        // Switch to discover and trigger search if we have a suggestion
        switchTab('discover');
        if (el.searchInput.value.trim()) {
            triggerSearch(el.searchInput.value.trim());
        }

        el.searchInput.focus();
    }

    function close() {
        el.backdrop.hidden = true;
        el.dialog.hidden   = true;
        el.chip.setAttribute('aria-expanded', 'false');
        document.removeEventListener('keydown', onKeyDown);
        el.chip.focus();
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') close();
    }

    el.chip.addEventListener('click', open);
    el.backdrop.addEventListener('click', close);
    el.closeTop.addEventListener('click', close);
    el.closeBottom?.addEventListener('click', close);

    // ── Init sub-modules ──────────────────────────────────────────────────────
    initDiscoverTab(el.panelDiscover, {
        onSaved: () => {
            // Briefly flash the saved tab button to indicate success
            const savedTab = el.tabs.find(t => t.dataset.resourcesTab === 'saved');
            savedTab?.classList.add('tab-flash');
            setTimeout(() => savedTab?.classList.remove('tab-flash'), 600);
        }
    });
    initSavedTab(el.panelSaved);
    initNotesTab(el.panelNotes, { getTasks });
}

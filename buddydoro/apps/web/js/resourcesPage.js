// Resources & Notes — standalone page script
import { apiGet } from './api/apiClient.js';
import { initDiscoverTab, triggerSearch } from './features/resourcesFeature/discoverTab.js';
import { initSavedTab, refreshSavedTab } from './features/resourcesFeature/savedTab.js';
import { initNotesTab, refreshNotesTab } from './features/resourcesFeature/notesTab.js';

// ── Auth guard ────────────────────────────────────────────────────────────────
if (!localStorage.getItem('authToken')) {
    window.location.href = 'login.html';
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const trigger   = document.getElementById('rpGoalTrigger');
const valueEl   = document.getElementById('rpGoalValue');
const list      = document.getElementById('rpGoalList');
const tabs      = Array.from(document.querySelectorAll('[data-rp-tab]'));
const panelDiscover = document.getElementById('rpTabDiscover');
const panelSaved    = document.getElementById('rpTabSaved');
const panelNotes    = document.getElementById('rpTabNotes');

// ── Custom dropdown ───────────────────────────────────────────────────────────
let selectedGoal = '';
let panels       = [];
let isOpen       = false;

function openDropdown() {
    if (!list.children.length) return;
    isOpen = true;
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onOutsideClick, true);
}

function closeDropdown() {
    isOpen = false;
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutsideClick, true);
}

function onOutsideClick(e) {
    if (!trigger.contains(e.target) && !list.contains(e.target)) closeDropdown();
}

trigger.addEventListener('click', () => isOpen ? closeDropdown() : openDropdown());

trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? closeDropdown() : openDropdown(); }
    if (e.key === 'Escape') closeDropdown();
});

function selectGoal(title) {
    selectedGoal = title;
    valueEl.textContent = title;
    valueEl.classList.add('is-selected');

    // Mark selected in list
    list.querySelectorAll('.rp-goal-option').forEach(opt => {
        opt.classList.toggle('is-selected', opt.dataset.value === title);
        opt.setAttribute('aria-selected', opt.dataset.value === title ? 'true' : 'false');
    });

    closeDropdown();
    switchTab('discover');
    triggerSearch(title);
}

function buildList(panelData) {
    list.innerHTML = '';

    if (!panelData.length) {
        list.innerHTML = `<li class="rp-goal-empty">No goals yet — add goals on the main page</li>`;
        trigger.disabled = true;
        return;
    }

    panelData.forEach(p => {
        const li = document.createElement('li');
        li.className = 'rp-goal-option';
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        li.dataset.value = p.title;

        li.innerHTML = `
            <span class="rp-goal-option-icon">🎯</span>
            <span>${escHtml(p.title)}</span>`;

        li.addEventListener('click', () => selectGoal(p.title));
        list.appendChild(li);
    });
}

// ── Tab switching ─────────────────────────────────────────────────────────────
let activeTab = 'discover';

function switchTab(tabKey) {
    activeTab = tabKey;
    tabs.forEach(btn => {
        const isActive = btn.dataset.rpTab === tabKey;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    panelDiscover.hidden = tabKey !== 'discover';
    panelSaved.hidden    = tabKey !== 'saved';
    panelNotes.hidden    = tabKey !== 'notes';

    if (tabKey === 'saved') refreshSavedTab();
    if (tabKey === 'notes') refreshNotesTab();
}

tabs.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.rpTab)));

// ── Init tab modules ──────────────────────────────────────────────────────────
initDiscoverTab(panelDiscover, {
    onSaved: () => {
        const savedTab = tabs.find(t => t.dataset.rpTab === 'saved');
        savedTab?.classList.add('tab-flash');
        setTimeout(() => savedTab?.classList.remove('tab-flash'), 600);
    }
});
initSavedTab(panelSaved);
initNotesTab(panelNotes, { getPanels: () => panels });

// ── Load panels ───────────────────────────────────────────────────────────────
async function loadPanels() {
    try {
        panels = await apiGet('/panels');
        buildList(panels);

        // Auto-select from URL ?q= param
        const queryParam = new URLSearchParams(window.location.search).get('q');
        if (queryParam) {
            const match = panels.find(p => p.title.toLowerCase() === queryParam.toLowerCase());
            if (match) selectGoal(match.title);
        }
    } catch {
        list.innerHTML = `<li class="rp-goal-empty">Could not load goals</li>`;
        trigger.disabled = true;
    }
}

loadPanels();

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

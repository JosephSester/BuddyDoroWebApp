import { fetchSavedResources, updateResourceNote, deleteResource } from '../../api/resourceService.js';

let _panel = null;

export function initSavedTab(panel) {
    _panel = panel;
}

export async function refreshSavedTab() {
    _panel.innerHTML = `<div class="resources-spinner-wrap"><div class="resources-spinner"></div></div>`;
    try {
        const resources = await fetchSavedResources();
        renderSaved(resources);
    } catch {
        _panel.innerHTML = `<p class="resources-error">Could not load saved resources.</p>`;
    }
}

function renderSaved(resources) {
    if (!resources.length) {
        _panel.innerHTML = `
            <div class="resources-empty">
                <span class="resources-empty-icon">🔖</span>
                <p>No saved resources yet.<br>Discover something and hit the bookmark icon.</p>
            </div>`;
        return;
    }

    _panel.innerHTML = '';

    const groups = { video: [], book: [], web: [] };
    resources.forEach(r => (groups[r.type] || groups.web).push(r));

    const labels = { video: '▶ Videos', book: '📚 Books', web: '🌐 Websites' };
    Object.entries(labels).forEach(([type, label]) => {
        if (!groups[type].length) return;
        const section = document.createElement('div');
        section.className = 'resources-section';
        section.innerHTML = `<h3 class="resources-section-label">${label}</h3>`;
        groups[type].forEach(r => section.appendChild(buildSavedCard(r)));
        _panel.appendChild(section);
    });
}

function buildSavedCard(resource) {
    const card = document.createElement('div');
    card.className = 'resource-card resource-card--saved';
    card.dataset.id = resource._id;

    const thumbHtml = resource.thumbnail
        ? `<img class="resource-thumb" src="${resource.thumbnail}" alt="" loading="lazy">`
        : `<div class="resource-thumb resource-thumb-placeholder">${resource.type === 'video' ? '▶' : '📖'}</div>`;

    const authorHtml = resource.author
        ? `<span class="resource-author">${escHtml(resource.author)}</span>`
        : '';

    card.innerHTML = `
        ${thumbHtml}
        <div class="resource-info">
            <a class="resource-title" href="${resource.url}" target="_blank" rel="noopener noreferrer">${escHtml(resource.title)}</a>
            ${authorHtml}
            <textarea class="resource-note-input" placeholder="Add a note…" rows="2" aria-label="Note for ${escHtml(resource.title)}">${escHtml(resource.note || '')}</textarea>
        </div>
        <button class="resource-delete-btn" type="button" title="Remove" aria-label="Remove ${escHtml(resource.title)}">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 6V4h6v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>`;

    const textarea = card.querySelector('.resource-note-input');
    let saveTimer = null;
    textarea.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            updateResourceNote(resource._id, textarea.value).catch(() => {});
        }, 800);
    });

    card.querySelector('.resource-delete-btn').addEventListener('click', async () => {
        card.classList.add('is-removing');
        try {
            await deleteResource(resource._id);
            card.remove();
            const section = _panel.querySelector(`[data-id="${resource._id}"]`);
            if (!section) checkEmpty();
        } catch {
            card.classList.remove('is-removing');
        }
    });

    return card;
}

function checkEmpty() {
    if (!_panel.querySelector('.resource-card')) {
        _panel.innerHTML = `
            <div class="resources-empty">
                <span class="resources-empty-icon">🔖</span>
                <p>No saved resources yet.</p>
            </div>`;
    }
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

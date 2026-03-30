import { fetchNotes, createNote, updateNote, deleteNote } from '../../api/resourceService.js';

let _panel = null;
let _getPanels = null;

export function initNotesTab(panel, { getPanels } = {}) {
    _panel = panel;
    _getPanels = getPanels;
}

export async function refreshNotesTab() {
    _panel.innerHTML = `<div class="resources-spinner-wrap"><div class="resources-spinner"></div></div>`;
    try {
        const notes = await fetchNotes();
        renderNotes(notes);
    } catch {
        _panel.innerHTML = `<p class="resources-error">Could not load notes.</p>`;
    }
}

function renderNotes(notes) {
    _panel.innerHTML = `
        <div class="notes-toolbar">
            <button class="btn-primary notes-new-btn" type="button" id="newNoteBtn">+ New Note</button>
        </div>
        <div class="notes-list" id="notesList"></div>`;

    const list = _panel.querySelector('#notesList');

    _panel.querySelector('#newNoteBtn').addEventListener('click', () => {
        // Remove empty-state placeholder if present
        const empty = list.querySelector('.resources-empty');
        if (empty) empty.remove();

        const card = buildNoteCard(null);
        list.prepend(card);
        card.querySelector('.note-body').focus();
    });

    if (!notes.length) {
        list.innerHTML = `
            <div class="resources-empty">
                <span class="resources-empty-icon">📝</span>
                <p>No notes yet. Hit <strong>+ New Note</strong> to start.</p>
            </div>`;
        return;
    }

    notes.forEach(note => list.appendChild(buildNoteCard(note)));
}

function buildNoteCard(note) {
    const isNew = !note;
    const card = document.createElement('div');
    card.className = 'note-card';
    if (!isNew) card.dataset.id = note._id;

    const panels = _getPanels?.() || [];
    const panelOptions = panels.map(p =>
        `<option value="${escHtml(p._id)}" data-title="${escHtml(p.title)}" ${note?.taskName === p.title ? 'selected' : ''}>${escHtml(p.title)}</option>`
    ).join('');

    const linkedLabel = note?.taskName
        ? `<span class="note-linked-goal">📌 ${escHtml(note.taskName)}</span>`
        : '';

    card.innerHTML = `
        <div class="note-header">
            <select class="note-task-select" aria-label="Link to goal">
                <option value="">No goal linked</option>
                ${panelOptions}
            </select>
            <button class="note-delete-btn" type="button" title="Delete note" aria-label="Delete note">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M9 6V4h6v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
        <textarea class="note-body" placeholder="Write your notes here…" rows="5" aria-label="Note content">${escHtml(note?.body || '')}</textarea>
        <div class="note-footer">
            <span class="note-date">${note ? formatDate(note.updatedAt) : 'New note — not saved yet'}</span>
            <button class="note-save-btn btn-primary" type="button">Save</button>
        </div>`;

    const textarea  = card.querySelector('.note-body');
    const saveBtn   = card.querySelector('.note-save-btn');
    const select    = card.querySelector('.note-task-select');
    const dateEl    = card.querySelector('.note-date');

    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        const selectedOption = select.options[select.selectedIndex];
        const goalTitle = selectedOption?.dataset?.title || null;

        const payload = {
            body: textarea.value,
            taskId: null,
            taskName: goalTitle
        };

        try {
            if (isNew || !card.dataset.id) {
                const created = await createNote(payload);
                card.dataset.id = created._id;
                dateEl.textContent = formatDate(created.updatedAt);
            } else {
                const updated = await updateNote(card.dataset.id, payload);
                dateEl.textContent = formatDate(updated.updatedAt);
            }
            saveBtn.textContent = 'Saved ✓';
            setTimeout(() => {
                saveBtn.textContent = 'Save';
                saveBtn.disabled = false;
            }, 1500);
        } catch {
            saveBtn.textContent = 'Save';
            saveBtn.disabled = false;
        }
    });

    card.querySelector('.note-delete-btn').addEventListener('click', async () => {
        if (!card.dataset.id) { card.remove(); checkEmpty(); return; }
        card.classList.add('is-removing');
        try {
            await deleteNote(card.dataset.id);
            card.remove();
            checkEmpty();
        } catch {
            card.classList.remove('is-removing');
        }
    });

    return card;
}

function checkEmpty() {
    const list = _panel.querySelector('#notesList');
    if (list && !list.querySelector('.note-card')) {
        list.innerHTML = `
            <div class="resources-empty">
                <span class="resources-empty-icon">📝</span>
                <p>No notes yet. Hit <strong>+ New Note</strong> to start.</p>
            </div>`;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

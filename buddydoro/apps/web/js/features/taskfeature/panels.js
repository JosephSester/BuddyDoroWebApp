// apps/web/js/features/taskfeature/panels.js
// Panel DOM helpers and panel CRUD UI handlers.

import { state, makeDomId } from './state.js';
import { MAX_PANELS } from './constants.js';
import { savePanelsToStorage } from './storage.js';
import { setTasksBusy } from './notifications.js';
import { deleteTaskPanel, deleteTaskSessions } from './storage.js';
import { deleteTaskSubtasks } from '../subtasks.js';
import { createPanel as apiCreatePanel, updatePanel as apiUpdatePanel, deletePanel as apiDeletePanel } from '../../api/panelService.js';
import { deleteTask as apiDeleteTask } from '../../api/taskService.js';

export function getPanelStack() {
    const stack = document.querySelector('#tasksStack');
    const templateEl = document.getElementById('tasksPanelTemplate');
    const template = templateEl?.content?.querySelector('.tasks-panel') || stack?.querySelector('.tasks-panel') || null;
    const chipRow = document.querySelector('.tasks-chip-row');
    const addBtn = document.querySelector('#addTasksPanel');
    return { stack, template, chipRow, addBtn, templateEl };
}

export function placeChipRow() {
    const { chipRow } = getPanelStack();
    if (!chipRow) return;
    chipRow.style.position = 'static';
    chipRow.style.right = '';
    chipRow.style.top = '';
}

export function ensureChipRowObserver() {
    if (state.chipRowObserverAttached) return;
    const { stack } = getPanelStack();
    if (!stack) return;
    state.chipRowObserverAttached = true;
    placeChipRow();
    state.chipRowObserver = new ResizeObserver(() => placeChipRow());
    state.chipRowObserver.observe(stack);
    window.addEventListener('resize', placeChipRow);
}

export function disconnectChipRowObserver() {
    if (state.chipRowObserver) {
        state.chipRowObserver.disconnect();
        state.chipRowObserver = null;
    }
    window.removeEventListener('resize', placeChipRow);
    state.chipRowObserverAttached = false;
}

export function countPanels() {
    const { stack } = getPanelStack();
    return stack ? stack.querySelectorAll('.tasks-panel').length : 0;
}

export function resetPanel(panel) {
    panel.querySelectorAll('.tasks-list').forEach(list => {
        list.innerHTML = '';
        delete list.dataset.panelId;
    });

    const titleEl = panel.querySelector('.tasks-title');
    if (titleEl) titleEl.textContent = 'Goal';

    const innerPanels = Array.from(panel.querySelectorAll('.tasks-panel'));
    innerPanels.forEach(p => { if (p !== panel) p.remove(); });

    const addButtons = Array.from(panel.querySelectorAll('.task-add'));
    addButtons.slice(1).forEach(btn => btn.remove());
}

export function wireHeaderRename(panel) {
    const titleEl = panel.querySelector('.tasks-title');
    const btn = panel.querySelector('.task-title-edit');
    const header = btn?.closest('.tasks-header') || titleEl?.parentNode;
    if (!titleEl || !btn) return;

    let editing = false;

    const closeInline = () => {
        const inline = header?.querySelector('.task-title-inline');
        if (inline) inline.remove();
        titleEl.hidden = false;
        btn.hidden = false;
        editing = false;
    };

    const saveTitle = async (value) => {
        const clean = (value || '').trim();
        if (!clean) { closeInline(); return; }
        titleEl.textContent = clean.slice(0, 40);
        savePanelsToStorage();
        try {
            const panelId = panel.id || panel.querySelector('.tasks-list')?.dataset.panelId;
            if (panelId) await apiUpdatePanel(panelId, { title: titleEl.textContent });
        } catch (e) { console.warn('[Panels] Failed to update panel title:', e); }
        closeInline();
    };

    const startInline = () => {
        if (editing) return;
        editing = true;
        const existing = header?.querySelector('.task-title-inline');
        if (existing) existing.remove();
        titleEl.hidden = true;
        btn.hidden = true;

        const wrapper = document.createElement('div');
        wrapper.className = 'task-title-inline';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-title-input';
        input.value = (titleEl.textContent || 'Tasks').trim();
        input.maxLength = 40;
        input.setAttribute('aria-label', 'Goal name');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); saveTitle(input.value); }
            if (e.key === 'Escape') { e.preventDefault(); closeInline(); }
        });
        input.addEventListener('blur', () => { closeInline(); });

        wrapper.append(input);
        if (header) {
            header.insertBefore(wrapper, titleEl);
        } else {
            titleEl.parentNode.insertBefore(wrapper, titleEl);
        }
        input.focus({ preventScroll: true });
        input.select();
    };

    btn.addEventListener('click', (e) => { e.stopPropagation(); startInline(); });
    btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startInline(); }
    });
}

export function wireHeaderDelete({ panel, onActiveCleared, updateActiveTaskVisuals = () => { }, notifyActiveChange = () => { } }) {
    const delBtn = panel.querySelector('.task-title-delete');
    if (!delBtn) return;

    delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const titleEl = panel.querySelector('.tasks-title');
        const name = (titleEl?.textContent || 'this goal').trim() || 'this goal';

        const ok = confirm(`Are you sure you want to delete "${name}"?`);
        if (!ok) return;

        const panelId = panel.id || panel.querySelector('.tasks-list')?.dataset.panelId;

        if (panelId) {
            const tasksInPanel = state.tasks.filter(t => t.panelId === panelId);
            console.log(`[Panel Delete] Found ${tasksInPanel.length} tasks in panel ${panelId}:`);

            const activeTaskInPanel = tasksInPanel.some(t => t.id === state.activeTaskId);

            setTasksBusy(true, 'Deleting goal and its tasks...');

            for (const task of tasksInPanel) {
                try {
                    console.log(`[Panel Delete] Deleting task ${task.id} from panel ${panelId}`);
                    await apiDeleteTask(task.id);
                    const i = state.tasks.findIndex(t => t.id === task.id);
                    if (i !== -1) state.tasks.splice(i, 1);
                    deleteTaskPanel(task.id);
                    deleteTaskSessions(task.id);
                    deleteTaskSubtasks(task.id);
                } catch (error) {
                    console.error(`[Panel Delete] Failed to delete task ${task.id}:`, error);
                }
            }

            setTasksBusy(false);

            if (activeTaskInPanel) {
                console.log('[Panel Delete] Active task was in deleted panel');
                state.activeTaskId = null;
                updateActiveTaskVisuals();
                notifyActiveChange();
                onActiveCleared?.();
            }

            try {
                await apiDeletePanel(panelId);
                console.log('[Panel Delete] Deleted panel from server:', panelId);
            } catch (e) {
                console.warn('[Panel Delete] Failed to delete panel from server:', e);
            }
        }

        panel.remove();

        savePanelsToStorage();

        const addBtn = document.querySelector('#addTasksPanel');
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.title = '';
        }
    });
}

export function wireAddTaskButtons(panel, onAddTaskClick) {
    panel.querySelectorAll('.task-add')
        .forEach(btn => btn.addEventListener('click', onAddTaskClick));
}

export function createPanelFromTemplate({ panelId, title = 'Goal', onAddTaskClick = () => { }, updateActiveTaskVisuals = () => { }, notifyActiveChange = () => { } } = {}) {
    const { stack, template } = getPanelStack();
    if (!stack || !template) return null;

    const clone = template.cloneNode(true);
    resetPanel(clone);

    if (panelId) clone.id = panelId;
    const cloneList = clone.querySelector('.tasks-list');
    if (cloneList && panelId) {
        cloneList.dataset.panelId = panelId;
    }
    if (cloneList && !state.els.tasksList) {
        state.els.tasksList = cloneList;
    }

    const titleEl = clone.querySelector('.tasks-title');
    if (titleEl) titleEl.textContent = title || 'Goal';

    wireHeaderRename(clone);
    wireHeaderDelete({ panel: clone, updateActiveTaskVisuals, notifyActiveChange });
    wireAddTaskButtons(clone, onAddTaskClick);

    stack.appendChild(clone);
    placeChipRow();
    return clone;
}

export async function createPanelWithTitle({ title = 'Goal', onAddTaskClick = () => { }, updateActiveTaskVisuals = () => { }, notifyActiveChange = () => { } } = {}) {
    const { stack, template } = getPanelStack();
    if (!stack || !template) throw new Error('Tasks stack not found.');

    ensureChipRowObserver();

    const current = countPanels();
    if (current >= MAX_PANELS) {
        throw new Error('Maximum number of goals reached.');
    }

    let serverPanel = null;
    try {
        serverPanel = await apiCreatePanel(title);
        console.log('[Panels] Created on server:', serverPanel);
    } catch (e) {
        console.warn('[Panels] Failed to create on server:', e);
        serverPanel = { id: crypto.randomUUID(), title };
    }

    const clone = createPanelFromTemplate({
        panelId: serverPanel.id,
        title: serverPanel.title || title || 'Goal',
        onAddTaskClick,
        updateActiveTaskVisuals,
        notifyActiveChange,
    });
    if (!clone) throw new Error('Unable to create goal panel.');
    console.log(`[Tasks] Created new panel with ID: ${serverPanel.id}`);
    clone.scrollIntoView({ behavior: 'smooth', block: 'start' });
    savePanelsToStorage();

    return { panelId: serverPanel.id, panelEl: clone };
}

export function mountTasksPanelAdder({ onAddTaskClick, updateActiveTaskVisuals, notifyActiveChange, setupTodoDialog }) {
    const { stack, addBtn, template } = getPanelStack();
    if (!stack || !addBtn || !template) return;

    ensureChipRowObserver();
    setupTodoDialog();

    wireHeaderRename(template);
    wireHeaderDelete({ panel: template, updateActiveTaskVisuals, notifyActiveChange });

    function rebindPanelEvents(panel) {
        wireHeaderRename(panel);
        wireHeaderDelete({ panel, updateActiveTaskVisuals, notifyActiveChange });
    }

    rebindPanelEvents(template);

    template.querySelectorAll('.task-add')
        .forEach(btn => btn.addEventListener('click', onAddTaskClick));
}

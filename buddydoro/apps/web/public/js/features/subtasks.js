// Subtasks module: local storage + UI builder
// Provides helpers to store subtasks per task and render UI sections

import { apiPut } from '../api/apiClient.js';

const SUBTASKS_KEY = 'buddyDoro.taskSubtasks';
let subtasksMap = null;

function ensureMap() {
    if (subtasksMap) return subtasksMap;
    try {
        const raw = localStorage.getItem(SUBTASKS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        subtasksMap = (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
        console.warn('[Subtasks] Failed to read map:', e);
        subtasksMap = {};
    }
    return subtasksMap;
}

function persist() {
    try {
        localStorage.setItem(SUBTASKS_KEY, JSON.stringify(subtasksMap || {}));
    } catch (e) {
        console.warn('[Subtasks] Failed to write map:', e);
    }
}

export function getSubtasks(taskId) {
    const map = ensureMap();
    return map[String(taskId)] ? [...map[String(taskId)]] : [];
}

export function setSubtasks(taskId, subtasks) {
    ensureMap();
    subtasksMap[String(taskId)] = subtasks;
    persist();
    apiPut(`/tasks/${taskId}/subtasks`, { subtasks }).catch(e =>
        console.warn('[Subtasks] API sync failed:', e)
    );
}

/** Hydrate the local map from tasks already fetched from the API. */
export function syncSubtasksFromTasks(tasks) {
    ensureMap();
    for (const task of tasks) {
        if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
            subtasksMap[String(task.id)] = task.subtasks;
        }
    }
    persist();
}

export function deleteTaskSubtasks(taskId) {
    ensureMap();
    delete subtasksMap[String(taskId)];
    persist();
}

export const makeSubtaskId = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export function renderList(task, listEl, { onSetTimerFromEstimate, onChange } = {}) {
    const subtasks = getSubtasks(task.id);
    listEl.innerHTML = '';

    if (!subtasks.length) {
        return;
    }

    subtasks.forEach(sub => {
        const row = document.createElement('div');
        row.className = 'subtask-row';
        row.dataset.subtaskId = sub.id;

        const left = document.createElement('div');
        left.className = 'subtask-left';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!sub.done;
        checkbox.setAttribute('aria-label', `Mark subtask ${sub.title} as done`);
        checkbox.addEventListener('click', ev => ev.stopPropagation());
        checkbox.addEventListener('change', (ev) => {
            ev.stopPropagation();
            const next = getSubtasks(task.id).map(s => s.id === sub.id ? { ...s, done: ev.target.checked } : s);
            setSubtasks(task.id, next);
            renderList(task, listEl, { onSetTimerFromEstimate, onChange });
            if (typeof onChange === 'function') onChange();
        });

        const titleBtn = document.createElement('button');
        titleBtn.type = 'button';
        titleBtn.className = 'subtask-title';
        titleBtn.textContent = sub.title || 'Subtask';
        titleBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (sub.estimate && typeof onSetTimerFromEstimate === 'function') {
                try { onSetTimerFromEstimate(sub.estimate); } catch (err) { console.error('Failed to set timer from subtask', err); }
            }
        });

        left.append(checkbox, titleBtn);

        const meta = document.createElement('div');
        meta.className = 'subtask-meta';
        if (sub.estimate) {
            const est = document.createElement('span');
            est.className = 'subtask-estimate';
            est.textContent = `${sub.estimate}m`;
            meta.append(est);
        }

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'subtask-del';
        del.setAttribute('aria-label', `Delete subtask ${sub.title}`);
        del.textContent = '×';
        del.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const filtered = getSubtasks(task.id).filter(s => s.id !== sub.id);
            setSubtasks(task.id, filtered);
            renderList(task, listEl, { onSetTimerFromEstimate, onChange });
            if (typeof onChange === 'function') onChange();
        });

        const right = document.createElement('div');
        right.className = 'subtask-right';
        right.append(meta, del);

        row.append(left, right);
        listEl.appendChild(row);
    });
}

function promptAddSubtask(task, { onSetTimerFromEstimate, onChange } = {}) {
    const title = prompt('Subtask name?');
    if (!title || !title.trim()) return;
    const raw = prompt('Time estimate (minutes)?');
    let estimate = Number(raw);
    if (!Number.isInteger(estimate) || estimate < 1) estimate = null;
    const sub = { id: makeSubtaskId(), title: title.trim(), estimate, done: false };
    const next = [...getSubtasks(task.id), sub];
    setSubtasks(task.id, next);
    if (typeof onChange === 'function') onChange();
}

export function createSubtasksToggle(task, container, { onAddSubtask, onSetTimerFromEstimate, onChange } = {}) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'subtask-toggle';
    toggle.textContent = '+';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Toggle subtasks');

    toggle.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const willOpen = container.hidden;
        container.hidden = !container.hidden;
        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');

        if (willOpen && typeof onAddSubtask === 'function') {
            onAddSubtask();
        }
    });

    return toggle;
}

export function createSubtasksSection(task, { onSetTimerFromEstimate, onChange } = {}) {
    const container = document.createElement('div');
    container.className = 'subtasks-container';
    container.hidden = true;

    const list = document.createElement('div');
    list.className = 'subtasks-list';
    renderList(task, list, { onSetTimerFromEstimate, onChange });

    container.append(list);

    return { wrap: container, wrapInner: container, list };
}

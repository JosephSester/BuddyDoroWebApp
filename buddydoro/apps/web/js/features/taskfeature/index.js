// apps/web/js/features/taskfeature/index.js
// Tasks feature composition root.

import { fetchTasks, updateTask } from '../../api/taskService.js';
import { fetchPanels } from '../../api/panelService.js';
import { setSubtasks, makeSubtaskId } from '../subtasks.js';

import { state } from './state.js';
import { CREATE_DEFAULT_ESTIMATE } from './constants.js';
import { loadPanelsFromStorage, readTaskPanelMap, readTaskSessionsMap, savePanelsToStorage, setTaskSessions } from './storage.js';
import { initTaskCrud } from './crud.js';
import { initEditors } from './editors.js';
import { initRender } from './render.js';
import { createPanelFromTemplate, createPanelWithTitle, getPanelStack, mountTasksPanelAdder, wireHeaderDelete, wireHeaderRename } from './panels.js';
import { renderTodoList, setupTodoDialog, syncTodoDialogState } from './todoDialog.js';

let crudRef = null;
let renderRef = null;
let editorsRef = null;
let onAddTaskClickRef = null;

export async function initTasks(opts = {}) {
    state.handlers.onActiveTaskChange = typeof opts.onActiveTaskChange === 'function'
        ? opts.onActiveTaskChange : () => { };
    state.handlers.onShouldStopTimer = typeof opts.onShouldStopTimer === 'function'
        ? opts.onShouldStopTimer : () => { };
    state.handlers.onTaskEstimate = typeof opts.onTaskEstimate === 'function'
        ? opts.onTaskEstimate : null;
    state.handlers.onSubtaskEstimate = typeof opts.onSubtaskEstimate === 'function'
        ? opts.onSubtaskEstimate : null;

    state.els.addTaskBtn = document.getElementById('addTaskBtn');
    state.els.tasksList = document.getElementById('tasksList');

    const crud = initTaskCrud({
        renderAllTasks: () => renderRef?.renderAllTasks?.(),
        onShouldStopTimer: state.handlers.onShouldStopTimer,
    });
    crudRef = crud;

    const editors = initEditors({
        addTask: async (...args) => crud.addTask(...args),
        renderAllTasks: () => renderRef?.renderAllTasks?.(),
        onTaskEstimate: state.handlers.onTaskEstimate,
    });
    editorsRef = editors;

    const render = initRender({
        editors,
        deleteTask: async (id) => crud.deleteTask(id),
        renderTodoList,
    });
    renderRef = render;

    const onAddTaskClick = (e) => {
        const button = e.currentTarget || e.target;
        const panel = button.closest('.tasks-panel');
        const list = panel?.querySelector('.tasks-list');
        if (!panel || !list) return;

        state.els.addTaskBtn = button;
        state.els.tasksList = list;

        if (!list.dataset.panelId || list.dataset.panelId === '') {
            const panelId = panel.id || crypto.randomUUID();
            list.dataset.panelId = panelId;
            console.log(`[Tasks] Setting panelId: ${panelId} for list`);
        }
        console.log(`[Tasks] Creating task in panel: ${list.dataset.panelId}`);

        if (state.createTaskCtx) {
            state.createTaskCtx.nameInput.focus({ preventScroll: true });
            state.createTaskCtx.nameInput.select();
            return;
        }
        if (state.tasks.length >= 50) {
            alert('You can create up to 50 tasks.');
            return;
        }
        editors.startCreateTask();
    };
    onAddTaskClickRef = onAddTaskClick;

    // === Sync panels with server first (fallback to local) ===
    let savedPanels = loadPanelsFromStorage();
    try {
        let apiPanels = await fetchPanels();
        if (!Array.isArray(apiPanels)) apiPanels = [];

        if (apiPanels.length === 0) {
            localStorage.setItem('buddydoro_panels', JSON.stringify([]));
            savedPanels = [];
        } else {
            const normalized = apiPanels.map((p, idx) => ({ panelId: String(p.id), title: p.title || 'Goal', order: Number.isFinite(p.order) ? p.order : idx }));
            localStorage.setItem('buddydoro_panels', JSON.stringify(normalized));
            savedPanels = normalized;
            console.log('[Panels] Synced from server:', normalized);
        }
    } catch (e) {
        console.warn('[Panels] Server sync failed, using local panels if any:', e);
    }

    console.log('[Init] savedPanels result:', savedPanels);
    if (savedPanels && savedPanels.length > 0) {
        const { stack, template } = getPanelStack();
        if (stack && template) {
            stack.innerHTML = '';
            savedPanels.forEach(panel => {
                createPanelFromTemplate({
                    panelId: panel.panelId,
                    title: panel.title,
                    onAddTaskClick,
                    updateActiveTaskVisuals: render.updateActiveTaskVisuals,
                    notifyActiveChange: render.notifyActiveChange,
                });
            });

            const firstList = stack.querySelector('.tasks-list');
            if (firstList) {
                state.els.tasksList = firstList;
            }

            console.log(`[Init] Restored ${savedPanels.length} panels from storage`);
            console.log('[Init] Panels now in DOM:', stack?.querySelectorAll('.tasks-panel').length);
        }
    } else {
        console.log('[Init] No panels to restore');
    }

    document.querySelectorAll('.tasks-panel .task-add')
        .forEach(btn => btn.addEventListener('click', onAddTaskClick));

    document.querySelectorAll('.tasks-panel').forEach(panel => {
        wireHeaderRename(panel);
        wireHeaderDelete({ panel, updateActiveTaskVisuals: render.updateActiveTaskVisuals, notifyActiveChange: render.notifyActiveChange });
    });

    setupTodoDialog({
        createPanelWithTitle: (args) => createPanelWithTitle({
            ...args,
            onAddTaskClick,
            updateActiveTaskVisuals: render.updateActiveTaskVisuals,
            notifyActiveChange: render.notifyActiveChange,
        }),
    });

    try {
        console.log('Loading tasks from API...');
        const apiTasks = await fetchTasks();
        state.tasks.length = 0;
        state.nextTaskId = 1;

        const localPanelMap = readTaskPanelMap();
        const localSessionsMap = readTaskSessionsMap();
        apiTasks.forEach(t => {
            const resolvedPanelId = t.panelId || localPanelMap?.[String(t.id)] || 'tasksPanel-1';
            const localSess = localSessionsMap?.[String(t.id)] || null;
            const resolvedTotal = (typeof t.total === 'number' && t.total > 0)
                ? t.total
                : (localSess?.total || CREATE_DEFAULT_ESTIMATE);
            const resolvedDone = (typeof t.done === 'number' && t.done >= 0)
                ? t.done
                : (typeof t.completed === 'boolean' ? (t.completed ? 1 : 0) : (localSess?.done || 0));
            state.tasks.push({
                id: t.id,
                name: t.text,
                total: resolvedTotal,
                done: Math.min(resolvedDone, resolvedTotal),
                panelId: resolvedPanelId,
            });
            const numId = Number(t.id);
            if (numId >= state.nextTaskId) state.nextTaskId = numId + 1;
        });

        console.log(`Loaded ${state.tasks.length} tasks from API`);

        try {
            const localMap = readTaskPanelMap();
            const missing = state.tasks.filter(t => !apiTasks.find(s => s.id === t.id)?.panelId && localMap?.[String(t.id)]);
            for (const t of missing) {
                await updateTask(t.id, { panelId: t.panelId });
                console.log('[Init] Backfilled panelId to server for task', t.id, '->', t.panelId);
            }
        } catch (e) {
            console.warn('[Init] Could not backfill panelId to server:', e);
        }
    } catch (error) {
        console.error('Failed to load tasks from API:', error);
    }

    render.renderAllTasks();
    render.notifyActiveChange();
    savePanelsToStorage();

    mountTasksPanelAdder({
        onAddTaskClick,
        updateActiveTaskVisuals: render.updateActiveTaskVisuals,
        notifyActiveChange: render.notifyActiveChange,
        setupTodoDialog: () => setupTodoDialog({
            createPanelWithTitle: (args) => createPanelWithTitle({
                ...args,
                onAddTaskClick,
                updateActiveTaskVisuals: render.updateActiveTaskVisuals,
                notifyActiveChange: render.notifyActiveChange,
            }),
        }),
    });
}

export function getActiveTaskId() {
    return state.activeTaskId;
}

export function getActiveTask() {
    if (state.activeTaskId == null) return null;
    return state.tasks.find(t => String(t.id) === String(state.activeTaskId)) || null;
}

export async function createPlanFromAI(plan) {
    if (!plan || !Array.isArray(plan.tasks) || plan.tasks.length === 0) {
        throw new Error('Plan is empty.');
    }

    if (!crudRef || !renderRef) {
        throw new Error('Tasks have not been initialized.');
    }

    const title = String(plan.title || 'Goal').trim().slice(0, 100) || 'Goal';
    const panel = await createPanelWithTitle({
        title,
        onAddTaskClick: onAddTaskClickRef || (() => { }),
        updateActiveTaskVisuals: renderRef?.updateActiveTaskVisuals || (() => { }),
        notifyActiveChange: renderRef?.notifyActiveChange || (() => { }),
    });
    const panelId = panel?.panelId || panel?.id;
    if (!panelId) throw new Error('Unable to create goal panel.');

    for (const task of plan.tasks) {
        const taskTitle = String(task.title || '').trim();
        if (!taskTitle) continue;
        const created = await crudRef.addTask(taskTitle, CREATE_DEFAULT_ESTIMATE, { panelId });
        const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
        if (created && subtasks.length) {
            const mapped = subtasks.map(sub => ({
                id: makeSubtaskId(),
                title: String(sub.title || 'Subtask').trim().slice(0, 80) || 'Subtask',
                estimate: null,
                done: false,
            }));
            setSubtasks(created.id, mapped);
        }
    }

    renderTodoList();
    syncTodoDialogState();
}

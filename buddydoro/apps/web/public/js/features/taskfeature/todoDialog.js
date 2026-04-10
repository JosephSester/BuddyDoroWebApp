// apps/web/js/features/taskfeature/todoDialog.js
// Todo dialog helpers.

import { state, makeDomId } from './state.js';
import { MAX_PANELS, TODO_ESCAPE_MAP } from './constants.js';
import { showTaskNotification } from './notifications.js';
import { countPanels, getPanelStack } from './panels.js';

const escapeHtml = (str) => String(str).replace(/[&<>"']/g, ch => TODO_ESCAPE_MAP[ch]);

export function getTodoDialogElements() {
    return {
        dialog: document.getElementById('todoDialog'),
        backdrop: document.getElementById('todoBackdrop'),
        createBtn: document.getElementById('todoCreateTask'),
        cancelBtn: document.getElementById('todoCancel'),
        closeBtn: document.getElementById('todoClose'),
        taskList: document.getElementById('todoTaskList'),
        noGoalMsg: document.getElementById('todoNoGoalMessage'),
        goalContainer: document.getElementById('todoGoalContainer'),
    };
}

export function isTodoDialogOpen() {
    const { dialog } = getTodoDialogElements();
    return Boolean(dialog && dialog.hasAttribute('aria-hidden') && dialog.getAttribute('aria-hidden') === 'false');
}

export function resolveTodoPanelContext() {
    const { stack } = getPanelStack();
    if (!stack) return null;
    let list = state.els.tasksList;
    if (!list || !document.contains(list)) {
        list = stack.querySelector('.tasks-list');
    }
    if (!list) return null;
    let panelId = list.dataset.panelId || list.closest('.tasks-panel')?.id || null;
    if (!panelId) {
        panelId = makeDomId('panel');
        list.dataset.panelId = panelId;
    }
    return { list, panelId };
}

export function renderTodoList() {
    const { taskList, noGoalMsg } = getTodoDialogElements();
    if (!taskList) return;
    taskList.innerHTML = '';
    taskList.hidden = true;
    if (noGoalMsg) noGoalMsg.hidden = true;
}

export function syncTodoDialogState() {
    const { createBtn, noGoalMsg, goalContainer } = getTodoDialogElements();
    const ctx = resolveTodoPanelContext();
    const hasGoal = Boolean(ctx);
    const atLimit = countPanels() >= MAX_PANELS;

    if (createBtn) {
        createBtn.disabled = atLimit;
    }

    if (goalContainer) {
        goalContainer.hidden = !hasGoal;
    }

    if (noGoalMsg) {
        noGoalMsg.hidden = hasGoal;
    }

    renderTodoList();
}

export function ensureStackInTodo(goalContainer) {
    const stack = document.getElementById('tasksStack');
    if (!stack || !goalContainer) return;
    goalContainer.hidden = false;
    if (stack.parentElement !== goalContainer) {
        goalContainer.appendChild(stack);
    }
}

export function openTodoDialog() {
    const { dialog, backdrop, createBtn, goalContainer } = getTodoDialogElements();
    if (!dialog || !backdrop) return;
    ensureStackInTodo(goalContainer);
    renderTodoList();
    syncTodoDialogState();
    state.suppressActiveInTodo = true;
    try { state.handlers.onTaskVisualsRefresh(); } catch { }
    dialog.hidden = false;
    dialog.setAttribute('aria-hidden', 'false');
    dialog.classList.add('is-open');
    backdrop.hidden = false;
    requestAnimationFrame(() => {
        if (createBtn && !createBtn.disabled) {
            createBtn.focus({ preventScroll: true });
        } else {
            dialog.focus({ preventScroll: true });
        }
    });
}

export function closeTodoDialog() {
    const { dialog, backdrop } = getTodoDialogElements();
    if (!dialog || !backdrop) return;
    dialog.hidden = true;
    dialog.setAttribute('aria-hidden', 'true');
    dialog.classList.remove('is-open');
    backdrop.hidden = true;
    state.suppressActiveInTodo = false;
    try { state.handlers.onTaskVisualsRefresh(); } catch { }
    const openBtn = document.getElementById('addTasksPanel');
    if (openBtn) {
        openBtn.focus({ preventScroll: true });
    }
}

export function handleTodoKeydown(evt) {
    if (evt.key !== 'Escape') return;
    if (!isTodoDialogOpen()) return;
    evt.preventDefault();
    closeTodoDialog();
}

export function setupTodoDialog({ createPanelWithTitle } = {}) {
    if (state.todoDialogSetupDone) return;
    const { dialog, backdrop, createBtn, cancelBtn, closeBtn, goalContainer } = getTodoDialogElements();
    const openBtn = document.getElementById('addTasksPanel');
    if (!dialog || !backdrop) return;

    state.todoDialogSetupDone = true;

    ensureStackInTodo(goalContainer);

    openBtn?.addEventListener('click', evt => {
        evt.preventDefault();
        openTodoDialog();
    });

    const dismiss = () => closeTodoDialog();
    backdrop.addEventListener('click', dismiss);
    cancelBtn?.addEventListener('click', dismiss);
    closeBtn?.addEventListener('click', dismiss);

    createBtn?.addEventListener('click', async () => {
        if (createBtn.disabled) return;
        try {
            const result = await createPanelWithTitle({ title: 'Goal' });
            renderTodoList();
            syncTodoDialogState();
            if (result?.panelEl) {
                result.panelEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (error) {
            console.warn('[ToDo] Could not create goal:', error);
            const message = error?.message || 'Unable to create goal.';
            showTaskNotification(message, 'error');
        }
    });

    document.addEventListener('keydown', handleTodoKeydown);
}

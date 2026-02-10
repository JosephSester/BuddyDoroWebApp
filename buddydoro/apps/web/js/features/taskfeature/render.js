// apps/web/js/features/taskfeature/render.js
// Task list rendering and selection behavior.

import { state, makeDomId } from './state.js';
import { closeTodoDialog, isTodoDialogOpen } from './todoDialog.js';
import { createSubtasksSection, createSubtasksToggle, getSubtasks, setSubtasks, makeSubtaskId, renderList } from '../subtasks.js';

export function initRender({ editors, deleteTask, renderTodoList }) {
    const notifyActiveChange = () => {
        try { state.handlers.onActiveTaskChange(state.activeTaskId); } catch { }
    };

    const formatSessions = task => `${task.done}/${task.total}`;
    const formatSubtaskProgress = task => {
        const subs = getSubtasks(task.id);
        if (!subs.length) return '0/0';
        const done = subs.filter(s => s.done).length;
        return `${done}/${subs.length}`;
    };

    const focusSiblingCard = (card, offset) => {
        const list = card.closest('.tasks-list');
        if (!list) return;

        const cards = Array.from(list.querySelectorAll('.task-card'));
        const idx = cards.indexOf(card); if (idx === -1 || cards.length === 0) return;
        let next = idx + offset;
        if (next < 0) next = cards.length - 1;
        if (next >= cards.length) next = 0;
        cards[next]?.focus();
    };

    const setActiveTask = (taskId) => {
        const taskIdStr = taskId != null ? String(taskId) : null;
        if (taskIdStr != null && !state.tasks.some(t => String(t.id) === taskIdStr)) return;

        const fromTodo = isTodoDialogOpen() || state.suppressActiveInTodo;

        if (String(state.activeTaskId) === taskIdStr) {
            if (fromTodo) {
                closeTodoDialog();
                updateActiveTaskVisuals();
                notifyActiveChange();
                return;
            }
            state.activeTaskId = null;
            try { state.handlers.onShouldStopTimer(); } catch { }
            updateActiveTaskVisuals();
            notifyActiveChange();
            return;
        }
        state.activeTaskId = taskIdStr;
        if (state.activeTaskId == null) {
            try { state.handlers.onShouldStopTimer(); } catch { }
        }
        if (fromTodo) {
            closeTodoDialog();
        }
        updateActiveTaskVisuals();
        notifyActiveChange();
    };

    const wireTaskCardInteractions = (card) => {
        const toggleHover = isOn => card.classList.toggle('is-hover', isOn);
        card.addEventListener('mouseenter', () => toggleHover(true));
        card.addEventListener('mouseleave', () => toggleHover(false));
        card.addEventListener('focus', () => toggleHover(true));
        card.addEventListener('blur', () => toggleHover(false));
        card.addEventListener('click', () => {
            setActiveTask(card.dataset.taskId);
        });
        card.addEventListener('keydown', evt => {
            if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault(); setActiveTask(card.dataset.taskId); return;
            }
            if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
                evt.preventDefault();
                focusSiblingCard(card, evt.key === 'ArrowDown' ? 1 : -1);
            }
        });
    };

    const createTaskCard = (task) => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.setAttribute('role', 'option');
        card.dataset.taskId = String(task.id);
        card.id = `task-option-${task.id}`;
        card.tabIndex = 0;

        const main = document.createElement('div');
        main.className = 'task-main';
        const name = document.createElement('span');
        name.className = 'task-name';
        name.textContent = task.name;
        main.append(name);

        const right = document.createElement('div');
        right.className = 'task-right';

        const bubble = document.createElement('div');
        bubble.className = 'session-bubble';
        bubble.setAttribute('aria-label', `Completed ${formatSubtaskProgress(task)} subtasks`);
        bubble.textContent = formatSubtaskProgress(task);
        bubble.addEventListener('click', evt => evt.stopPropagation());
        bubble.addEventListener('mousedown', evt => evt.stopPropagation());

        const del = document.createElement('button');
        del.className = 'task-del';
        del.type = 'button';
        del.setAttribute('aria-label', `Delete task: ${task.name}`);
        del.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6l1 2H8l1-2zm1 6v8m4-8v8"
            fill="none" stroke="#2b2213" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        del.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (confirm(`Delete "${task.name}"?`)) deleteTask(task.id);
        });

        right.append(bubble, del);
        card.append(main, right);

        const handleSubtaskEstimate = state.handlers.onSubtaskEstimate || state.handlers.onTaskEstimate;

        const subsSection = createSubtasksSection(task, {
            onSetTimerFromEstimate: handleSubtaskEstimate,
            onChange: renderAllTasks,
        });

        const openSubtaskNameEditor = () => {
            const existing = subsSection.wrapInner.querySelector('.subtask-create');
            if (existing) {
                const input = existing.querySelector('input');
                input?.focus();
                input?.select();
                return;
            }

            const editor = document.createElement('div');
            editor.className = 'task-create subtask-create';

            const fields = document.createElement('div');
            fields.className = 'task-create-fields';

            const nameField = document.createElement('div');
            nameField.className = 'task-create-field';
            const nameInputId = makeDomId('createSubtaskName');
            const nameLabel = document.createElement('label');
            nameLabel.className = 'task-create-label';
            nameLabel.textContent = 'Name';
            nameLabel.setAttribute('for', nameInputId);
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'task-create-input task-create-name';
            nameInput.placeholder = 'Subtask name...';
            nameInput.required = true;
            nameInput.setAttribute('aria-label', 'Subtask name');
            nameInput.id = nameInputId;
            nameField.append(nameLabel, nameInput);

            fields.append(nameField);
            editor.appendChild(fields);

            const actions = document.createElement('div');
            actions.className = 'task-create-actions';
            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'task-create-save';
            saveBtn.textContent = 'Save';
            saveBtn.disabled = true;
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'task-create-cancel';
            cancelBtn.textContent = 'Cancel';
            actions.append(saveBtn, cancelBtn);
            editor.appendChild(actions);

            const errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            errorEl.setAttribute('aria-live', 'polite');
            errorEl.hidden = true;
            editor.appendChild(errorEl);

            const stopPropagation = evt => evt.stopPropagation();
            [editor, nameInput, saveBtn, cancelBtn].forEach(el => {
                ['click', 'mousedown', 'mouseup', 'dblclick'].forEach(evtName => el.addEventListener(evtName, stopPropagation));
            });

            const showError = (message) => {
                if (message) {
                    errorEl.hidden = false;
                    errorEl.textContent = message;
                } else {
                    errorEl.hidden = true;
                    errorEl.textContent = '';
                }
            };

            const validate = () => {
                const title = nameInput.value.trim();
                const message = title ? '' : 'Name is required.';
                saveBtn.disabled = Boolean(message);
                showError(message);
                return { title, valid: !message };
            };

            const teardown = (focusToggle = true) => {
                if (editor.parentElement) editor.parentElement.removeChild(editor);
                if (focusToggle) subToggle?.focus({ preventScroll: true });
            };

            const commit = () => {
                const { title, valid } = validate();
                if (!valid) return;
                const sub = { id: makeSubtaskId(), title, estimate: null, done: false };
                const next = [...getSubtasks(task.id), sub];
                setSubtasks(task.id, next);
                renderList(task, subsSection.list, { onSetTimerFromEstimate: handleSubtaskEstimate, onChange: renderAllTasks });
                bubble.textContent = formatSubtaskProgress(task);
                bubble.setAttribute('aria-label', `Completed ${formatSubtaskProgress(task)} subtasks`);
                subsSection.wrapInner.hidden = false;
                subToggle.setAttribute('aria-expanded', 'true');
                teardown(false);
            };

            const onKey = evt => {
                if (evt.key === 'Enter') { evt.preventDefault(); commit(); }
                else if (evt.key === 'Escape') { evt.preventDefault(); teardown(); }
            };

            nameInput.addEventListener('input', validate);
            nameInput.addEventListener('keydown', onKey);
            saveBtn.addEventListener('click', commit);
            cancelBtn.addEventListener('click', () => teardown());

            subsSection.wrapInner.prepend(editor);
            nameInput.focus();
            nameInput.select();
        };

        const subToggle = createSubtasksToggle(task, subsSection.wrapInner, {
            onAddSubtask: () => {
                openSubtaskNameEditor();
            },
            onSetTimerFromEstimate: handleSubtaskEstimate,
            onChange: renderAllTasks,
        });
        right.insertBefore(subToggle, del);

        card.append(subsSection.wrap);

        wireTaskCardInteractions(card);
        return card;
    };

    const updateActiveTaskVisuals = () => {
        let activeCard = null;
        document.querySelectorAll('.tasks-panel .task-card').forEach(card => {
            const isActive = !state.suppressActiveInTodo
                && String(card.dataset.taskId) === String(state.activeTaskId);
            card.classList.toggle('is-active', isActive);
            card.setAttribute('aria-selected', isActive ? 'true' : 'false');
            if (isActive) activeCard = card;
        });

        document.querySelectorAll('.tasks-list').forEach(list => {
            const activeInList = list.querySelector('.task-card.is-active');
            if (activeInList) {
                list.setAttribute('aria-activedescendant', activeInList.id);
            } else {
                list.removeAttribute('aria-activedescendant');
            }
        });
    };

    state.handlers.onTaskVisualsRefresh = updateActiveTaskVisuals;

    const ensureActiveTaskIsValid = () => {
        if (state.activeTaskId != null && !state.tasks.some(t => String(t.id) === String(state.activeTaskId))) {
            state.activeTaskId = null;
            try { state.handlers.onShouldStopTimer(); } catch { }
        }
    };

    const renderAllTasks = () => {
        document.querySelectorAll('.tasks-panel').forEach(panel => {
            const list = panel.querySelector('.tasks-list');
            if (!list) return;

            const panelId = list.dataset.panelId || panel.id || makeDomId('panel');
            if (!list.dataset.panelId) list.dataset.panelId = panelId;

            const createNode = (list === state.els.tasksList) ? (state.createTaskCtx?.container || null) : null;

            const panelTasks = state.tasks.filter(t => {
                const matches = t.panelId === panelId;
                if (!matches && t.panelId) {
                    return false;
                }
                return matches;
            });

            list.innerHTML = '';
            if (createNode) list.appendChild(createNode);
            panelTasks.forEach(t => list.appendChild(createTaskCard(t)));
        });

        ensureActiveTaskIsValid();
        updateActiveTaskVisuals();
        notifyActiveChange();
        renderTodoList?.();
    };

    return {
        renderAllTasks,
        updateActiveTaskVisuals,
        ensureActiveTaskIsValid,
        setActiveTask,
        notifyActiveChange,
    };
}

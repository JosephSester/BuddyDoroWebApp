// apps/web/js/features/taskfeature/editors.js
// Inline editors for creating tasks.

import { state, makeDomId } from './state.js';
import { CREATE_DEFAULT_ESTIMATE, CREATE_NAME_MAX, SESSION_MAX, TASK_NAME_ALLOWED_MESSAGE, TASK_NAME_PATTERN } from './constants.js';

export function initEditors({ addTask } = {}) {
    const showCreateTaskError = (message, ctx = state.createTaskCtx) => {
        if (!ctx || !ctx.errorEl) return;
        if (message) {
            ctx.errorEl.hidden = false;
            ctx.errorEl.textContent = message;
        } else {
            ctx.errorEl.hidden = true;
            ctx.errorEl.textContent = '';
        }
    };

    const setCreateButtonDisabled = (disabled) => {
        if (!state.els.addTaskBtn) return;
        state.els.addTaskBtn.disabled = !!disabled;
    };

    const validateCreateTask = (ctx, { forceShow = false } = {}) => {
        if (!ctx) return { valid: false };
        if (forceShow) ctx.shouldShowErrors = true;
        const title = ctx.nameInput.value.trim();

        let message = '';
        if (!title) message = 'Name is required.';
        else if (title.length > CREATE_NAME_MAX) message = `Name must be ${CREATE_NAME_MAX} characters or fewer.`;
        else if (!TASK_NAME_PATTERN.test(title)) message = TASK_NAME_ALLOWED_MESSAGE;

        let estimateValue = ctx.estimateValue ?? CREATE_DEFAULT_ESTIMATE;
        if (!Number.isInteger(estimateValue) || estimateValue < 1 || estimateValue > SESSION_MAX) {
            estimateValue = CREATE_DEFAULT_ESTIMATE;
            ctx.estimateValue = estimateValue;
        }

        ctx.saveBtn.disabled = Boolean(message);
        const shouldShow = ctx.shouldShowErrors || forceShow;
        showCreateTaskError(shouldShow ? message : '', ctx);
        return { valid: !message, title, estimate: estimateValue };
    };

    const teardownCreateTaskEditor = ({ focusButton = true } = {}) => {
        if (!state.createTaskCtx) return;
        const ctx = state.createTaskCtx;
        ctx.cleanupFns.forEach(fn => { try { fn(); } catch { } });
        ctx.cleanupFns.length = 0;
        if (ctx.container.parentElement) { ctx.container.parentElement.removeChild(ctx.container); }
        state.createTaskCtx = null;
        setCreateButtonDisabled(false);
        if (focusButton && state.els.addTaskBtn) { state.els.addTaskBtn.focus({ preventScroll: true }); }
    };

    const cancelCreateTask = ({ focusButton = true } = {}) => {
        if (!state.createTaskCtx) return;
        teardownCreateTaskEditor({ focusButton });
    };

    const attemptCreateTaskSave = async () => {
        if (!state.createTaskCtx) return;
        const ctx = state.createTaskCtx;
        const result = validateCreateTask(ctx, { forceShow: true });
        if (!result.valid) return;

        const { title, estimate } = result;
        if (state.tasks.length >= 50) {
            showCreateTaskError('You can create up to 50 tasks.', ctx);
            ctx.saveBtn.disabled = true;
            return;
        }

        try {
            await addTask(title, estimate, { atTop: true, panelId: ctx.panelId });
            teardownCreateTaskEditor({ focusButton: false });
        } catch (err) {
            showCreateTaskError(err?.message || 'Unable to create task. Please try again.', ctx);
        }
    };

    const startCreateTask = (initial = {}) => {
        if (state.createTaskCtx) {
            if (typeof initial.title === 'string') {
                state.createTaskCtx.nameInput.value = initial.title.trim().slice(0, CREATE_NAME_MAX);
            }
            if (initial.estimate !== undefined) {
                let estValue = Number(initial.estimate);
                if (!Number.isInteger(estValue) || estValue < 1 || estValue > SESSION_MAX) {
                    estValue = CREATE_DEFAULT_ESTIMATE;
                }
                state.createTaskCtx.estimateValue = estValue;
            }
            if (initial.error) {
                state.createTaskCtx.shouldShowErrors = true;
                showCreateTaskError(initial.error, state.createTaskCtx);
            }
            validateCreateTask(state.createTaskCtx);
            if (initial.error) { showCreateTaskError(initial.error, state.createTaskCtx); }
            state.createTaskCtx.nameInput.focus({ preventScroll: true });
            state.createTaskCtx.nameInput.select();
            return;
        }

        const initialTitle = (initial.title ?? '').trim().slice(0, CREATE_NAME_MAX);
        let initialEstimate = Number(initial.estimate);
        if (!Number.isInteger(initialEstimate) || initialEstimate < 1 || initialEstimate > SESSION_MAX) {
            initialEstimate = CREATE_DEFAULT_ESTIMATE;
        }

        const container = document.createElement('div');
        container.className = 'task-card task-create';
        const labelId = makeDomId('createTaskLabel');
        container.setAttribute('role', 'form');
        container.setAttribute('aria-labelledby', labelId);

        const heading = document.createElement('div');
        heading.id = labelId;
        heading.className = 'sr-only';
        heading.textContent = 'Create task';
        container.appendChild(heading);

        const fields = document.createElement('div');
        fields.className = 'task-create-fields';

        const nameField = document.createElement('div');
        nameField.className = 'task-create-field';
        const nameInputId = makeDomId('createTaskName');
        const nameLabel = document.createElement('label');
        nameLabel.className = 'task-create-label';
        nameLabel.textContent = 'Name';
        nameLabel.setAttribute('for', nameInputId);
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'task-create-input task-create-name';
        nameInput.placeholder = 'Task name...';
        nameInput.maxLength = CREATE_NAME_MAX;
        nameInput.value = initialTitle;
        nameInput.required = true;
        nameInput.setAttribute('aria-label', 'Task name');
        nameInput.id = nameInputId;
        nameField.append(nameLabel, nameInput);

        fields.append(nameField);
        container.appendChild(fields);

        const actions = document.createElement('div');
        actions.className = 'task-create-actions';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'task-create-save';
        saveBtn.textContent = 'Save';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'task-create-cancel';
        cancelBtn.textContent = 'Cancel';
        actions.append(saveBtn, cancelBtn);
        container.appendChild(actions);

        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.setAttribute('aria-live', 'polite');
        errorEl.hidden = true;
        container.appendChild(errorEl);

        const stopPropagation = evt => evt.stopPropagation();
        [container, nameInput, saveBtn, cancelBtn].forEach(el => {
            ['click', 'mousedown', 'mouseup', 'dblclick', 'keydown'].forEach(evtName => el.addEventListener(evtName, stopPropagation));
        });

        const ctx = {
            container,
            nameInput,
            saveBtn,
            cancelBtn,
            errorEl,
            panelId: state.els.tasksList?.dataset.panelId || 'tasksPanel-1',
            shouldShowErrors: Boolean(initial.error),
            estimateValue: initialEstimate,
            cleanupFns: [],
        };

        const handleInput = () => { ctx.shouldShowErrors = true; validateCreateTask(ctx); };
        nameInput.addEventListener('input', handleInput);
        ctx.cleanupFns.push(() => nameInput.removeEventListener('input', handleInput));

        const handleNameKey = evt => {
            if (evt.key === 'Enter') { evt.preventDefault(); ctx.shouldShowErrors = true; attemptCreateTaskSave(); }
            else if (evt.key === 'Escape') { evt.preventDefault(); cancelCreateTask(); }
        };
        nameInput.addEventListener('keydown', handleNameKey);
        ctx.cleanupFns.push(() => nameInput.removeEventListener('keydown', handleNameKey));

        const handleButtonKey = evt => {
            if (evt.key === 'Escape') { evt.preventDefault(); cancelCreateTask(); }
        };
        saveBtn.addEventListener('keydown', handleButtonKey);
        cancelBtn.addEventListener('keydown', handleButtonKey);
        ctx.cleanupFns.push(() => saveBtn.removeEventListener('keydown', handleButtonKey));
        ctx.cleanupFns.push(() => cancelBtn.removeEventListener('keydown', handleButtonKey));

        const onSaveClick = () => { ctx.shouldShowErrors = true; attemptCreateTaskSave(); };
        const onCancelClick = () => cancelCreateTask();
        saveBtn.addEventListener('click', onSaveClick);
        cancelBtn.addEventListener('click', onCancelClick);
        ctx.cleanupFns.push(() => saveBtn.removeEventListener('click', onSaveClick));
        ctx.cleanupFns.push(() => cancelBtn.removeEventListener('click', onCancelClick));

        const onContainerKeydown = evt => {
            if (evt.key === 'Escape') { evt.preventDefault(); cancelCreateTask(); }
        };
        container.addEventListener('keydown', onContainerKeydown);
        ctx.cleanupFns.push(() => container.removeEventListener('keydown', onContainerKeydown));

        state.els.tasksList.prepend(container);
        state.createTaskCtx = ctx;
        setCreateButtonDisabled(true);

        validateCreateTask(ctx);
        if (initial.error) { showCreateTaskError(initial.error, ctx); }
        nameInput.focus();
        nameInput.select();
    };

    return {
        startCreateTask,
        cancelCreateTask,
        validateCreateTask,
        showCreateTaskError,
        setCreateButtonDisabled,
    };
}

// apps/web/js/features/aiPlan.js
import { generatePlan } from '../api/aiService.js';
import { createPlanFromAI } from './taskfeature/index.js';
import { showNotification, setBusy } from '../utils/notifications.js';

const MAX_GOAL_LENGTH = 200;

function sanitizeText(value, fallback = '') {
    if (typeof value !== 'string') return fallback;
    return value.trim();
}

function normalizePlan(rawPlan, fallbackGoal) {
    const plan = (rawPlan && typeof rawPlan === 'object') ? rawPlan : {};
    const title = sanitizeText(plan.title, fallbackGoal || 'Goal').slice(0, 80) || 'Goal';
    const description = sanitizeText(plan.description, '').slice(0, 240);
    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];

    return {
        title,
        description,
        tasks: tasks.map((task, index) => {
            const taskTitle = sanitizeText(task?.title, `Task ${index + 1}`).slice(0, 80) || `Task ${index + 1}`;
            const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
            return {
                title: taskTitle,
                subtasks: subtasks.map((sub, subIndex) => ({
                    title: sanitizeText(sub?.title, `Subtask ${subIndex + 1}`).slice(0, 80) || `Subtask ${subIndex + 1}`,
                    estimate: null
                }))
            };
        })
    };
}

function buildTaskRow(task, taskIndex, onChange, onAddSubtask, onDeleteTask, onDeleteSubtask) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-plan-task';

    const header = document.createElement('div');
    header.className = 'ai-plan-task-header';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'ai-plan-input';
    titleInput.value = task.title;
    titleInput.placeholder = 'Task title';
    titleInput.addEventListener('input', () => onChange(taskIndex, 'title', titleInput.value));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'ai-plan-remove';
    deleteBtn.textContent = 'Remove';
    deleteBtn.addEventListener('click', () => onDeleteTask(taskIndex));

    header.append(titleInput, deleteBtn);

    const subHeader = document.createElement('div');
    subHeader.className = 'ai-plan-subheader';

    const subTitle = document.createElement('span');
    subTitle.textContent = 'Subtasks';

    const addSubtaskBtn = document.createElement('button');
    addSubtaskBtn.type = 'button';
    addSubtaskBtn.className = 'ai-plan-add-subtask';
    addSubtaskBtn.textContent = 'Add subtask';
    addSubtaskBtn.addEventListener('click', () => onAddSubtask(taskIndex));

    subHeader.append(subTitle, addSubtaskBtn);

    const subList = document.createElement('div');
    subList.className = 'ai-plan-subtasks';

    task.subtasks.forEach((subtask, subIndex) => {
        const row = document.createElement('div');
        row.className = 'ai-plan-subtask-row';

        const subTitleInput = document.createElement('input');
        subTitleInput.type = 'text';
        subTitleInput.className = 'ai-plan-input';
        subTitleInput.value = subtask.title;
        subTitleInput.placeholder = 'Subtask title';
        subTitleInput.addEventListener('input', () => onChange(taskIndex, `subtask-title-${subIndex}`, subTitleInput.value));

        const subDeleteBtn = document.createElement('button');
        subDeleteBtn.type = 'button';
        subDeleteBtn.className = 'ai-plan-remove';
        subDeleteBtn.textContent = 'Remove';
        subDeleteBtn.addEventListener('click', () => onDeleteSubtask(taskIndex, subIndex));

        row.append(subTitleInput, subDeleteBtn);
        subList.appendChild(row);
    });

    wrapper.append(header, subHeader, subList);
    return wrapper;
}


export function initAiPlanPage() {
    const goalInput   = document.getElementById('aiGoalInput');
    const generateBtn = document.getElementById('aiGenerateBtn');
    const preview     = document.getElementById('aiPlanPreview');
    const addTaskBtn  = document.getElementById('aiAddTaskBtn');
    const createBtn   = document.getElementById('aiCreatePlanBtn');
    const descriptionEl = document.getElementById('aiPlanDescription');

    if (!goalInput || !generateBtn || !preview || !addTaskBtn || !createBtn) return;

    let draft = null;

    const renderPreview = () => {
        preview.innerHTML = '';
        if (!draft || !draft.tasks.length) {
            const empty = document.createElement('div');
            empty.className = 'ai-plan-empty';
            empty.textContent = 'Generate a plan to see tasks here.';
            preview.appendChild(empty);
            return;
        }
        if (descriptionEl) {
            descriptionEl.textContent = draft.description ? `Overview: ${draft.description}` : '';
        }
        draft.tasks.forEach((task, taskIndex) => {
            const row = buildTaskRow(
                task, taskIndex,
                (idx, field, value) => {
                    if (!draft || !draft.tasks[idx]) return;
                    if (field === 'title') {
                        draft.tasks[idx].title = sanitizeText(value, draft.tasks[idx].title);
                    } else if (field.startsWith('subtask-title-')) {
                        const subIndex = Number(field.replace('subtask-title-', ''));
                        if (draft.tasks[idx].subtasks[subIndex]) {
                            draft.tasks[idx].subtasks[subIndex].title = sanitizeText(value, draft.tasks[idx].subtasks[subIndex].title);
                        }
                    }
                },
                (idx) => {
                    if (!draft || !draft.tasks[idx]) return;
                    draft.tasks[idx].subtasks.push({ title: 'New subtask', estimate: null });
                    renderPreview();
                },
                (idx) => { if (draft) { draft.tasks.splice(idx, 1); renderPreview(); } },
                (idx, subIdx) => {
                    if (!draft || !draft.tasks[idx]) return;
                    draft.tasks[idx].subtasks.splice(subIdx, 1);
                    renderPreview();
                }
            );
            preview.appendChild(row);
        });
    };

    renderPreview();

    generateBtn.addEventListener('click', async () => {
        const goal = sanitizeText(goalInput.value, '').slice(0, MAX_GOAL_LENGTH);
        if (!goal) { showNotification('Please describe your goal first.', 'error'); return; }
        setBusy(true, 'Generating plan...');
        try {
            const plan = await generatePlan(goal);
            draft = normalizePlan(plan, goal);
            renderPreview();
            showNotification('Plan generated. You can edit it now.', 'success');
        } catch (err) {
            console.error('AI plan generation failed:', err);
            showNotification(err?.message || 'Failed to generate plan.', 'error');
        } finally {
            setBusy(false);
        }
    });

    addTaskBtn.addEventListener('click', () => {
        if (!draft) draft = { title: sanitizeText(goalInput.value, 'Goal') || 'Goal', description: '', tasks: [] };
        draft.tasks.push({ title: 'New task', subtasks: [] });
        renderPreview();
    });

    createBtn.addEventListener('click', async () => {
        if (!draft || !draft.tasks.length) {
            showNotification('Generate or add tasks before creating a plan.', 'error');
            return;
        }
        const hasEmpty = draft.tasks.some(task => !sanitizeText(task.title, ''));
        if (hasEmpty) { showNotification('Please fill in all task titles.', 'error'); return; }
        setBusy(true, 'Creating plan...');
        try {
            await createPlanFromAI(draft);
            showNotification('Plan created!', 'success');
            window.location.href = 'index.html';
        } catch (err) {
            console.error('Failed to create plan:', err);
            showNotification(err?.message || 'Failed to create plan.', 'error');
        } finally {
            setBusy(false);
        }
    });
}

// apps/web/js/features/taskfeature/crud.js
// Task CRUD operations against API and local state.

import { createTask, deleteTask as apiDeleteTask, updateTask } from '../../api/taskService.js';
import { state } from './state.js';
import { CREATE_DEFAULT_ESTIMATE } from './constants.js';
import { setTasksBusy, showTaskNotification } from './notifications.js';
import { deleteTaskPanel, deleteTaskSessions, setTaskPanel, setTaskSessions } from './storage.js';
import { deleteTaskSubtasks } from '../subtasks.js';

export function initTaskCrud({ renderAllTasks, onShouldStopTimer } = {}) {
    const addTask = async (name, total, { atTop = false, panelId: providedPanelId } = {}) => {
        setTasksBusy(true, 'Saving task...');
        try {
            const panelId = providedPanelId || state.els.tasksList?.dataset.panelId || 'tasksPanel-1';

            if (!panelId || panelId === '') {
                console.error('[Tasks] Invalid panelId during task creation!');
                throw new Error('Cannot create task without valid panel ID');
            }

            console.log(`[Tasks] Adding task "${name}" to panel: ${panelId}`);

            let apiTask;
            try {
                apiTask = await createTask(name, panelId);
            } catch (fetchError) {
                // Server unreachable — save locally with a generated ID
                console.warn('[Tasks] Server unavailable, saving task locally:', fetchError.message);
                apiTask = {
                    id: `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
                    text: name,
                    panelId,
                };
            }

            const t = {
                id: apiTask.id,
                name: apiTask.text,
                total: Number(total || CREATE_DEFAULT_ESTIMATE),
                done: 0,
                panelId: panelId,
            };
            if (atTop) state.tasks.unshift(t); else state.tasks.push(t);
            setTaskSessions(t.id, { total: t.total, done: t.done });
            setTaskPanel(t.id, panelId);
            renderAllTasks();
            console.log('Task created:', t);
            showTaskNotification('Task saved', 'success');
            return t;
        } catch (error) {
            console.error('Failed to create task:', error);
            const errorMsg = error.message || 'Could not save task. Please try again.';
            showTaskNotification(errorMsg, 'error');
            throw error;
        } finally {
            setTasksBusy(false);
        }
    };

    const deleteTask = async (id) => {
        setTasksBusy(true, 'Deleting task...');
        try {
            try {
                await apiDeleteTask(id);
            } catch (fetchError) {
                console.warn('[Tasks] Server unavailable, deleting task locally:', fetchError.message);
            }

            const i = state.tasks.findIndex(t => t.id === id);
            if (i === -1) return;
            const [removed] = state.tasks.splice(i, 1);
            if (removed.id === state.activeTaskId) {
                state.activeTaskId = null;
                showTaskNotification('Active task deleted — timer stopped.', 'warning');
                try { onShouldStopTimer?.(); } catch { }
            }
            deleteTaskPanel(id);
            deleteTaskSessions(id);
            deleteTaskSubtasks(id);
            renderAllTasks();
            console.log('Task deleted:', id);
            showTaskNotification('Task deleted', 'success');
        } catch (error) {
            console.error('Failed to delete task:', error);
            const errorMsg = error.message || 'Could not delete task. Please try again.';
            showTaskNotification(errorMsg, 'error');
            throw error;
        } finally {
            setTasksBusy(false);
        }
    };

    return { addTask, deleteTask, updateTask };
}

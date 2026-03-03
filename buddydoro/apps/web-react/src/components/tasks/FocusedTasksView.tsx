import { useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { TaskItem } from './TaskItem';
import taskStyles from './Tasks.module.css';
import styles from './FocusedTasksView.module.css';

export function FocusedTasksView() {
  const { panels, tasks, activeTaskId, focusedPanelId, setFocusedPanel, createTask } = useTaskStore();
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');

  const focusedPanel = panels.find(p => p.id === focusedPanelId) ?? null;
  const focusedTasks = focusedPanel ? tasks.filter(t => t.panelId === focusedPanel.id) : [];

  async function handleAddTask() {
    const text = newTaskText.trim();
    if (!text || !focusedPanelId) return;
    await createTask(text, focusedPanelId);
    setNewTaskText('');
    setAddingTask(false);
  }

  function handleAddKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAddTask();
    if (e.key === 'Escape') { setNewTaskText(''); setAddingTask(false); }
  }

  if (!focusedPanel) {
    return (
      <div className={styles.picker}>
        <p className={styles.pickerHint}>Choose a goal to focus on:</p>
        {panels.length === 0 && (
          <div className={styles.empty}>No goals yet. Create one in the Goals tab.</div>
        )}
        {panels.map(panel => (
          <button key={panel.id} className={styles.pickRow} onClick={() => setFocusedPanel(panel.id)}>
            <span className={styles.pickName}>{panel.title}</span>
            <span className={styles.pickAction}>Focus →</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.focused}>
      <div className={styles.focusedHeader}>
        <button className={styles.backBtn} onClick={() => setFocusedPanel(null)}>
          <ArrowLeft size={12} /> Change
        </button>
        <span className={styles.focusedTitle}>{focusedPanel.title}</span>
      </div>

      <div className={taskStyles.taskList}>
        {focusedTasks.length === 0 && !addingTask && (
          <div className={styles.empty}>No tasks yet. Add one below.</div>
        )}
        {focusedTasks.map(task => (
          <TaskItem key={task.id} task={task} isActive={task.id === activeTaskId} />
        ))}
      </div>

      {addingTask ? (
        <div className={taskStyles.taskEditorRow}>
          <input
            className={taskStyles.taskEditorInput}
            placeholder="Task name…"
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            onKeyDown={handleAddKeyDown}
            autoFocus
          />
          <button className={taskStyles.taskEditorSave} onClick={handleAddTask}>Add</button>
          <button className={taskStyles.taskEditorCancel} onClick={() => { setNewTaskText(''); setAddingTask(false); }}>✕</button>
        </div>
      ) : (
        <button className={taskStyles.addTaskBtn} onClick={() => setAddingTask(true)}>
          <Plus size={14} /> Add task
        </button>
      )}
    </div>
  );
}

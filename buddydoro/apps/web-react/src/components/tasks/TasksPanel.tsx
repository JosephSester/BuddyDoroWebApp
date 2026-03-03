import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import type { Panel } from '../../api/panelApi';
import { TaskItem } from './TaskItem';
import styles from './Tasks.module.css';

interface Props {
  panel: Panel;
}

export function TasksPanel({ panel }: Props) {
  const { tasks, activeTaskId, createTask, updatePanel, deletePanel } = useTaskStore();
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const panelTasks = tasks.filter(t => t.panelId === panel.id);

  async function handleAddTask() {
    const text = newTaskText.trim();
    if (!text) return;
    await createTask(text, panel.id);
    setNewTaskText('');
    setAddingTask(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAddTask();
    if (e.key === 'Escape') { setNewTaskText(''); setAddingTask(false); }
  }

  async function handleTitleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim() || panel.title;
    if (val !== panel.title) await updatePanel(panel.id, { title: val });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <input
          className={styles.panelTitleInput}
          defaultValue={panel.title}
          onBlur={handleTitleBlur}
          maxLength={40}
        />
        <div className={styles.panelActions}>
          <button
            className={`${styles.panelActionBtn} ${styles.danger}`}
            onClick={() => deletePanel(panel.id)}
            title="Delete panel"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className={styles.taskList}>
        {panelTasks.map(task => (
          <TaskItem key={task.id} task={task} isActive={task.id === activeTaskId} />
        ))}
      </div>

      {addingTask ? (
        <div className={styles.taskEditorRow}>
          <input
            className={styles.taskEditorInput}
            placeholder="Task name…"
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button className={styles.taskEditorSave} onClick={handleAddTask}>Add</button>
          <button className={styles.taskEditorCancel} onClick={() => { setNewTaskText(''); setAddingTask(false); }}>✕</button>
        </div>
      ) : (
        <button className={styles.addTaskBtn} onClick={() => setAddingTask(true)}>
          <Plus size={14} />
          Add task
        </button>
      )}
    </div>
  );
}

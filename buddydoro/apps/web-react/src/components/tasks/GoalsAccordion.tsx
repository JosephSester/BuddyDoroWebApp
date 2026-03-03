import { useState } from 'react';
import { Plus, ChevronDown, Trash2 } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import type { Panel } from '../../api/panelApi';
import { TaskItem } from './TaskItem';
import styles from './GoalsAccordion.module.css';
import taskStyles from './Tasks.module.css';

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface GoalRowProps {
  panel: Panel;
}

function GoalRow({ panel }: GoalRowProps) {
  const { tasks, activeTaskId, createTask, updatePanel, deletePanel } = useTaskStore();
  const [open, setOpen] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');

  const panelTasks = tasks.filter(t => t.panelId === panel.id);
  const completedCount = panelTasks.filter(t => t.completed).length;

  async function handleAddTask() {
    const text = newTaskText.trim();
    if (!text) return;
    await createTask(text, panel.id);
    setNewTaskText('');
    setAddingTask(false);
  }

  function handleAddKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAddTask();
    if (e.key === 'Escape') { setNewTaskText(''); setAddingTask(false); }
  }

  async function handleTitleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim() || panel.title;
    if (val !== panel.title) await updatePanel(panel.id, { title: val });
  }

  return (
    <div className={`${styles.goalRow} ${open ? styles.goalRowOpen : ''}`}>
      <div
        className={styles.goalHeader}
        onClick={() => setOpen(v => !v)}
        role="button"
        aria-expanded={open}
      >
        <div className={styles.goalHeaderLeft}>
          <input
            className={styles.goalTitleInput}
            defaultValue={panel.title}
            onBlur={handleTitleBlur}
            onClick={e => e.stopPropagation()}
            maxLength={40}
          />
          {panel.dueDate && (
            <span className={styles.dueChip}>{formatDueDate(panel.dueDate)}</span>
          )}
        </div>

        <div className={styles.goalHeaderRight}>
          <span className={styles.taskCount}>{completedCount}/{panelTasks.length}</span>
          <ChevronDown
            size={14}
            className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          />
          <button
            className={`${styles.goalActionBtn} ${styles.danger}`}
            onClick={e => { e.stopPropagation(); deletePanel(panel.id); }}
            title="Delete goal"
            aria-label="Delete goal"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className={styles.goalBody}>
        <div className={styles.goalBodyInner}>
          <div className={taskStyles.taskList}>
            {panelTasks.map(task => (
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
              <button
                className={taskStyles.taskEditorCancel}
                onClick={() => { setNewTaskText(''); setAddingTask(false); }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button className={taskStyles.addTaskBtn} onClick={() => setAddingTask(true)}>
              <Plus size={14} /> Add task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GoalsAccordion() {
  const { panels, createPanel } = useTaskStore();

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <span className={styles.columnTitle}>Goals</span>
        <button className={styles.addPanelBtn} onClick={() => createPanel()}>
          <Plus size={12} /> Add goal
        </button>
      </div>

      <div className={styles.list}>
        {panels.map(panel => (
          <GoalRow key={panel.id} panel={panel} />
        ))}
        {panels.length === 0 && (
          <div className={styles.emptyState}>
            No goals yet. Click "+ Add goal" to create one!
          </div>
        )}
      </div>
    </div>
  );
}

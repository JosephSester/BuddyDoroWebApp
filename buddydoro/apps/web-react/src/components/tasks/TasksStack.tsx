import { Plus } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { TasksPanel } from './TasksPanel';
import styles from './Tasks.module.css';

export function TasksStack() {
  const { panels, createPanel } = useTaskStore();

  return (
    <div className={styles.tasksColumn}>
      <div className={styles.columnHeader}>
        <span className={styles.columnTitle}>Goals</span>
        <button className={styles.addPanelBtn} onClick={() => createPanel()}>
          <Plus size={12} /> Add goal
        </button>
      </div>

      <div className={styles.tasksStack}>
        {panels.map(panel => (
          <TasksPanel key={panel.id} panel={panel} />
        ))}
        {panels.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-brown-light)', fontFamily: 'var(--font-primary)', fontSize: 'var(--text-sm)' }}>
            No goals yet. Add one to get started!
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Pencil, Trash2, Check, Play } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import type { Task } from '../../api/taskApi';
import styles from './Tasks.module.css';

interface Props {
  task: Task;
  isActive: boolean;
}

export function TaskItem({ task, isActive }: Props) {
  const { updateTask, deleteTask, setActiveTask, activeTaskId } = useTaskStore();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);

  async function toggleDone() {
    await updateTask(task.id, { completed: !task.completed });
  }

  async function saveEdit() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== task.text) {
      await updateTask(task.id, { text: trimmed });
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') { setEditText(task.text); setEditing(false); }
  }

  function toggleActive() {
    setActiveTask(activeTaskId === task.id ? null : task.id);
  }

  if (editing) {
    return (
      <div className={styles.taskEditorRow}>
        <input
          className={styles.taskEditorInput}
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button className={styles.taskEditorSave} onClick={saveEdit}>
          <Check size={14} />
        </button>
        <button className={styles.taskEditorCancel} onClick={() => { setEditText(task.text); setEditing(false); }}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.taskItem} ${isActive ? styles.active : ''}`}>
      <button
        className={`${styles.taskCheckbox} ${task.completed ? styles.checked : ''}`}
        onClick={toggleDone}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed && <Check size={11} strokeWidth={3} color="white" />}
      </button>

      <span
        className={`${styles.taskText} ${task.completed ? styles.done : ''}`}
        onClick={toggleActive}
      >
        {task.text}
      </span>

      <div className={styles.taskItemActions}>
        <button
          className={styles.taskItemBtn}
          onClick={toggleActive}
          title={isActive ? 'Deselect' : 'Focus on this task'}
        >
          <Play size={12} fill={isActive ? 'currentColor' : 'none'} />
        </button>
        <button
          className={styles.taskItemBtn}
          onClick={() => { setEditText(task.text); setEditing(true); }}
          title="Edit"
        >
          <Pencil size={12} />
        </button>
        <button
          className={`${styles.taskItemBtn} ${styles.danger}`}
          onClick={() => deleteTask(task.id)}
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

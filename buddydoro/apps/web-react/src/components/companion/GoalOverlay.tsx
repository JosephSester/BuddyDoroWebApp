import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useCompanionStore } from '../../stores/companionStore';
import { CompanionSVG } from './CompanionSVG';
import { notify } from '../../hooks/useNotification';
import styles from './GoalOverlay.module.css';

interface Props {
  onClose: () => void;
}

export function GoalOverlay({ onClose }: Props) {
  const { createPanel, createTask } = useTaskStore();
  const { companionType } = useCompanionStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [goalName, setGoalName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taskTexts, setTaskTexts] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);

  function handleNext() {
    if (!goalName.trim()) return;
    setStep(2);
  }

  function addTaskRow() {
    setTaskTexts(prev => [...prev, '']);
  }

  function updateTaskRow(index: number, value: string) {
    setTaskTexts(prev => prev.map((t, i) => (i === index ? value : t)));
  }

  function removeTaskRow(index: number) {
    setTaskTexts(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const panel = await createPanel(goalName.trim(), dueDate || null);
      const texts = taskTexts.map(t => t.trim()).filter(Boolean);
      await Promise.all(texts.map(text => createTask(text, panel.id)));
      notify('Goal created!', 'success');
      onClose();
    } catch {
      notify('Failed to create goal', 'error');
      setSubmitting(false);
    }
  }

  const companionPrompts: Record<1 | 2, string> = {
    1: "What goal do you want to work on?",
    2: "How will you achieve it?",
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Left — companion display */}
        <div className={styles.companionSide}>
          <div className={styles.companionDisplay}>
            <CompanionSVG type={companionType} eyeState="open" />
          </div>
          <p className={styles.companionPrompt}>{companionPrompts[step]}</p>
        </div>

        {/* Right — form */}
        <div className={styles.formSide}>
          <div className={styles.formHeader}>
            <div className={styles.stepIndicator}>
              <span className={`${styles.stepDot} ${step === 1 ? styles.active : styles.done}`} />
              <span className={`${styles.stepDot} ${step === 2 ? styles.active : ''}`} />
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={14} />
            </button>
          </div>

          {step === 1 && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="goal-name">Goal name</label>
                <input
                  id="goal-name"
                  className={styles.input}
                  type="text"
                  placeholder="e.g. Learn Spanish"
                  maxLength={40}
                  value={goalName}
                  onChange={e => setGoalName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNext(); }}
                  autoFocus
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="goal-date">Due date <span className={styles.optional}>(optional)</span></label>
                <input
                  id="goal-date"
                  className={styles.input}
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  className={styles.btnPrimary}
                  onClick={handleNext}
                  disabled={!goalName.trim()}
                >
                  Next →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Add tasks <span className={styles.optional}>(optional)</span></label>
                <div className={styles.taskRows}>
                  {taskTexts.map((text, i) => (
                    <div key={i} className={styles.taskRow}>
                      <input
                        className={`${styles.input} ${styles.taskRowInput}`}
                        type="text"
                        placeholder={`Task ${i + 1}`}
                        value={text}
                        onChange={e => updateTaskRow(i, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); addTaskRow(); }
                        }}
                      />
                      <button
                        className={styles.removeTaskBtn}
                        onClick={() => removeTaskRow(i)}
                        disabled={taskTexts.length === 1}
                        aria-label="Remove task"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button className={styles.addTaskRowBtn} onClick={addTaskRow}>
                  <Plus size={13} /> Add another task
                </button>
              </div>

              <div className={styles.formActions}>
                <button className={styles.btnSecondary} onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Creating…' : 'Create goal'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

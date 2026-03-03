import { createPortal } from 'react-dom';
import { useTimerStore } from '../../stores/timerStore';
import styles from './Timer.module.css';

interface Props {
  onDismiss: () => void;
}

export function TimerSummary({ onDismiss }: Props) {
  const { mode, sessionCount, start, setMode } = useTimerStore();

  // Called when the timer just completed — show what was finished
  const justFinished = mode === 'break' ? 'focus' : 'break';

  function startBreak() {
    setMode('break');
    start();
    onDismiss();
  }

  function skipBreak() {
    setMode('focus');
    onDismiss();
  }

  const isFocusDone = justFinished === 'focus';

  return createPortal(
    <div className={styles.summaryOverlay} onClick={onDismiss}>
      <div className={styles.summaryCard} onClick={e => e.stopPropagation()}>
        <div className={styles.summaryIcon}>{isFocusDone ? '🌟' : '☕'}</div>
        <div className={styles.summaryTitle}>
          {isFocusDone ? 'Focus session done!' : 'Break time is up!'}
        </div>
        <div className={styles.summaryBody}>
          {isFocusDone
            ? `Great work! You've completed ${sessionCount} session${sessionCount !== 1 ? 's' : ''} today. Time for a little break?`
            : 'Ready to get back into focus mode?'}
        </div>
        <div className={styles.summaryActions}>
          {isFocusDone ? (
            <>
              <button className={styles.summaryBtnPrimary} onClick={startBreak}>
                Start break ☕
              </button>
              <button className={styles.summaryBtnSecondary} onClick={skipBreak}>
                Skip break
              </button>
            </>
          ) : (
            <button className={styles.summaryBtnPrimary} onClick={skipBreak}>
              Start focusing 🌟
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

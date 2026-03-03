import { useTimerStore } from '../../stores/timerStore';
import styles from './Timer.module.css';

export function ModeChips() {
  const { mode, setMode } = useTimerStore();

  return (
    <div className={styles.modeChips}>
      <button
        className={`${styles.modeChip} ${mode === 'focus' ? styles.active : ''}`}
        onClick={() => setMode('focus')}
      >
        Focus
      </button>
      <button
        className={`${styles.modeChip} ${mode === 'break' ? styles.breakActive : ''}`}
        onClick={() => setMode('break')}
      >
        Break
      </button>
    </div>
  );
}

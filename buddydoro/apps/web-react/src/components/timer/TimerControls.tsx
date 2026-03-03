import { Play, Pause, RotateCcw } from 'lucide-react';
import { useTimerStore } from '../../stores/timerStore';
import styles from './Timer.module.css';

export function TimerControls() {
  const { isRunning, start, pause, reset } = useTimerStore();

  return (
    <div className={styles.controls}>
      <button className={styles.btnIcon} onClick={reset} aria-label="Reset timer">
        <RotateCcw size={15} />
      </button>

      <button
        className={styles.btnPlay}
        onClick={isRunning ? pause : start}
        aria-label={isRunning ? 'Pause' : 'Start'}
      >
        {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
      </button>

      {/* spacer to balance layout */}
      <div style={{ width: 36 }} />
    </div>
  );
}

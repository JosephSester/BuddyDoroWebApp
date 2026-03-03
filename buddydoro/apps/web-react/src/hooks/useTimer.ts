import { useEffect } from 'react';
import { useTimerStore } from '../stores/timerStore';

export function useTimer() {
  const isRunning = useTimerStore(s => s.isRunning);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      useTimerStore.getState().tick();
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);
}

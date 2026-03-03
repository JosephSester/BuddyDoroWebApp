import { useEffect, useRef } from 'react';
import { useTimerStore } from '../stores/timerStore';
import { useCurrencyStore } from '../stores/currencyStore';

const BLOCK_SECONDS = 5 * 60;
const DOROS_PER_BLOCK = 50;

export function useEarnDoros() {
  const earnedBlocksRef = useRef(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    return useTimerStore.subscribe((state, prev) => {
      if (state.mode !== 'focus' || !state.isRunning) {
        if (prev.mode === 'focus' && !state.isRunning) {
          // timer stopped — reset tracking
          earnedBlocksRef.current = 0;
          elapsedRef.current = 0;
        }
        return;
      }

      // timer ticked
      if (state.remaining < prev.remaining) {
        elapsedRef.current += prev.remaining - state.remaining;
        const blocks = Math.floor(elapsedRef.current / BLOCK_SECONDS);
        if (blocks > earnedBlocksRef.current) {
          const delta = (blocks - earnedBlocksRef.current) * DOROS_PER_BLOCK;
          earnedBlocksRef.current = blocks;
          useCurrencyStore.getState().addDoros(delta);
        }
      }
    });
  }, []);
}

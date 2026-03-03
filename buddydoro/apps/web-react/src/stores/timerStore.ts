import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimerMode = 'focus' | 'break';

interface TimerState {
  mode: TimerMode;
  isRunning: boolean;
  remaining: number;       // seconds
  duration: number;        // seconds for current session
  focusDefault: number;    // minutes (persisted)
  breakDefault: number;    // minutes (persisted)
  plannedFocusDuration: number | null;
  sessionCount: number;    // completed focus sessions this run
  breakEnabled: boolean;
}

interface TimerActions {
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  setMode: (mode: TimerMode) => void;
  applyDefaults: (focusMin: number, breakMin: number) => void;
  setPlannedFocusDuration: (seconds: number | null) => void;
  setBreakEnabled: (v: boolean) => void;
  completeSession: () => void;
}

const DEFAULT_FOCUS = 25;
const DEFAULT_BREAK = 5;

export const useTimerStore = create<TimerState & TimerActions>()(
  persist(
    (set, get) => ({
      mode: 'focus',
      isRunning: false,
      remaining: DEFAULT_FOCUS * 60,
      duration: DEFAULT_FOCUS * 60,
      focusDefault: DEFAULT_FOCUS,
      breakDefault: DEFAULT_BREAK,
      plannedFocusDuration: null,
      sessionCount: 0,
      breakEnabled: true,

      start: () => set({ isRunning: true }),
      pause: () => set({ isRunning: false }),

      reset: () => {
        const { mode, focusDefault, breakDefault } = get();
        const secs = (mode === 'focus' ? focusDefault : breakDefault) * 60;
        set({ isRunning: false, remaining: secs, duration: secs });
      },

      tick: () => {
        const { remaining } = get();
        if (remaining <= 1) {
          set({ remaining: 0, isRunning: false });
          get().completeSession();
        } else {
          set({ remaining: remaining - 1 });
        }
      },

      setMode: (mode) => {
        const { focusDefault, breakDefault } = get();
        const secs = (mode === 'focus' ? focusDefault : breakDefault) * 60;
        set({ mode, remaining: secs, duration: secs, isRunning: false });
      },

      applyDefaults: (focusMin, breakMin) => {
        const { mode } = get();
        const secs = (mode === 'focus' ? focusMin : breakMin) * 60;
        set({
          focusDefault: focusMin,
          breakDefault: breakMin,
          remaining: secs,
          duration: secs,
          isRunning: false,
        });
      },

      setPlannedFocusDuration: (seconds) => set({ plannedFocusDuration: seconds }),
      setBreakEnabled: (v) => set({ breakEnabled: v }),

      completeSession: () => {
        const { mode, sessionCount, focusDefault, breakDefault, breakEnabled } = get();
        if (mode === 'focus') {
          const newCount = sessionCount + 1;
          if (breakEnabled) {
            const breakSecs = breakDefault * 60;
            set({ mode: 'break', remaining: breakSecs, duration: breakSecs, sessionCount: newCount });
          } else {
            set({ sessionCount: newCount });
          }
        } else {
          const focusSecs = focusDefault * 60;
          set({ mode: 'focus', remaining: focusSecs, duration: focusSecs });
        }
      },
    }),
    {
      name: 'buddydoro-timer',
      partialize: (state) => ({
        focusDefault: state.focusDefault,
        breakDefault: state.breakDefault,
        breakEnabled: state.breakEnabled,
      }),
    }
  )
);

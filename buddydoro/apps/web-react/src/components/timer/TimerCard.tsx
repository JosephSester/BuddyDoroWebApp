import { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useTimerStore } from '../../stores/timerStore';
import styles from './Timer.module.css';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

export function TimerCard() {
  const { mode, remaining, sessionCount } = useTimerStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  return (
    <div className={`${styles.timerCard} ${mode === 'break' ? styles.breakMode : ''}`}>
      <div className={styles.timerDisplay}>{formatTime(remaining)}</div>
      <div className={styles.timerLabel}>{mode === 'focus' ? 'Focus' : 'Break'}</div>
      {sessionCount > 0 && (
        <div className={styles.sessionCount}>
          {sessionCount} session{sessionCount !== 1 ? 's' : ''} done
        </div>
      )}

      <button
        className={styles.menuTrigger}
        onClick={() => setMenuOpen(v => !v)}
        aria-label="Timer settings"
      >
        <Settings size={13} />
      </button>

      {menuOpen && (
        <div ref={menuRef} className={styles.menuPopover}>
          <TimerMenu onClose={() => setMenuOpen(false)} />
        </div>
      )}
    </div>
  );
}

function TimerMenu({ onClose }: { onClose: () => void }) {
  const { focusDefault, breakDefault, applyDefaults } = useTimerStore();
  const [focus, setFocus] = useState(String(focusDefault));
  const [brk, setBrk] = useState(String(breakDefault));

  function save() {
    const f = Math.max(1, Math.min(120, Number(focus) || focusDefault));
    const b = Math.max(1, Math.min(60, Number(brk) || breakDefault));
    applyDefaults(f, b);
    onClose();
  }

  return (
    <>
      <div className={styles.menuTitle}>Timer settings</div>
      <div className={styles.menuRow}>
        <span className={styles.menuLabel}>Focus (min)</span>
        <input
          className={styles.menuInput}
          type="number"
          min={1}
          max={120}
          value={focus}
          onChange={e => setFocus(e.target.value)}
        />
      </div>
      <div className={styles.menuRow}>
        <span className={styles.menuLabel}>Break (min)</span>
        <input
          className={styles.menuInput}
          type="number"
          min={1}
          max={60}
          value={brk}
          onChange={e => setBrk(e.target.value)}
        />
      </div>
      <button className={styles.menuSave} onClick={save}>Save</button>
    </>
  );
}

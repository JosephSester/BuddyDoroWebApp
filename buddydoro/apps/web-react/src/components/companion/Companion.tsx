import { useState, useEffect } from 'react';
import { useCompanionStore } from '../../stores/companionStore';
import { useTimerStore } from '../../stores/timerStore';
import { CompanionSVG } from './CompanionSVG';
import styles from './Companion.module.css';

const BLINK_INTERVAL = 3500;
const BLINK_DURATION = 200;

export function Companion() {
  const { life, maxLife, companionType } = useCompanionStore();
  const { isRunning, mode } = useTimerStore();
  const [eyeState, setEyeState] = useState<'open' | 'closed'>('open');
  const [isWiggling, setIsWiggling] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setEyeState('closed');
      setTimeout(() => setEyeState('open'), BLINK_DURATION);
    }, BLINK_INTERVAL);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isRunning && mode === 'focus') {
      setIsWiggling(true);
      setTimeout(() => setIsWiggling(false), 700);
    }
  }, [isRunning, mode]);

  const animClass = isWiggling ? styles.wiggling : '';

  return (
    <div className={styles.companionWrap}>
      <div className={`${styles.svgWrap} ${animClass}`}>
        <CompanionSVG type={companionType} eyeState={eyeState} />
      </div>
      <LifeBar life={life} maxLife={maxLife} />
    </div>
  );
}

function LifeBar({ life, maxLife }: { life: number; maxLife: number }) {
  return (
    <div className={styles.lifeBar}>
      {Array.from({ length: maxLife }, (_, i) => {
        const filled = i < life;
        const low = life <= 4 && filled;
        return (
          <div
            key={i}
            className={`${styles.lifeSegment} ${filled ? styles.filled : ''} ${low ? styles.low : ''}`}
            title={`${life}/${maxLife} life`}
          />
        );
      })}
    </div>
  );
}

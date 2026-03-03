import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCurrencyStore } from '../../stores/currencyStore';
import { useTaskStore } from '../../stores/taskStore';
import { useTimerStore } from '../../stores/timerStore';

import { useTimer } from '../../hooks/useTimer';
import { useEarnDoros } from '../../hooks/useEarnDoros';
import { useLifeDecay } from '../../hooks/useLifeDecay';
import { useSceneTime } from '../../hooks/useSceneTime';

import { Scene } from '../../components/layout/Scene/Scene';
import { Topbar } from '../../components/layout/Topbar/Topbar';
import { Companion } from '../../components/companion/Companion';
import { TimerCard } from '../../components/timer/TimerCard';
import { TimerControls } from '../../components/timer/TimerControls';
import { ModeChips } from '../../components/timer/ModeChips';
import { TimerSummary } from '../../components/timer/TimerSummary';
import { StoreModal } from '../../components/store/StoreModal';
import { ToastContainer } from '../../components/ui/Toast/ToastContainer';

import styles from './MainPage.module.css';

export function MainPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setDoros, setDiamonds } = useCurrencyStore();
  const { loadAll } = useTaskStore();
  const [showSummary, setShowSummary] = useState(false);

  useTimer();
  useEarnDoros();
  useLifeDecay();
  useSceneTime();

  useEffect(() => {
    if (user && !user.hasSeenOnboarding) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      setDoros(user.doros);
      setDiamonds(user.diamonds);
    }
  }, [user, setDoros, setDiamonds]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    return useTimerStore.subscribe((state, prev) => {
      if (!state.isRunning && prev.isRunning && state.remaining === 0) {
        setShowSummary(true);
      }
    });
  }, []);

  return (
    <div className={styles.page}>
      <Scene />
      <Companion />
      <Topbar />

      <div className={styles.uiLayer}>
        <div className={styles.timerCol}>
          <TimerCard />
          <TimerControls />
          <ModeChips />
        </div>
      </div>

      {showSummary && (
        <TimerSummary onDismiss={() => setShowSummary(false)} />
      )}

      <StoreModal />
      <ToastContainer />
    </div>
  );
}

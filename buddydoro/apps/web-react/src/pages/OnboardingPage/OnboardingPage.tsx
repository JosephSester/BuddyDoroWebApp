import { useState } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/userApi';
import styles from './OnboardingPage.module.css';

interface Slide {
  icon: string;
  title: string;
  body: React.ReactElement;
}

const SLIDES: Slide[] = [
  {
    icon: '🍵',
    title: 'Welcome to BuddyDoro!',
    body: (
      <>
        BuddyDoro is your{' '}
        <span className={styles.slideHighlight}>cozy focus companion</span>.
        Work in focused sessions, earn rewards, and take care of your little buddy.
        Let's take a quick tour!
      </>
    ),
  },
  {
    icon: '⏱️',
    title: 'The Focus Timer',
    body: (
      <>
        Use the <span className={styles.slideHighlight}>Pomodoro timer</span> to work in focused
        sessions — 25 minutes on, 5 minutes off. You can customize the duration to fit your flow.
        Your tasks live in the panel on the right.
      </>
    ),
  },
  {
    icon: '🌰',
    title: 'Earn Doros',
    body: (
      <>
        Every <span className={styles.slideHighlight}>5 minutes</span> of focused work earns you{' '}
        <span className={styles.slideHighlight}>50 Doros</span>. Spend them in the store on treats
        and toys for your buddy! The more you focus, the happier your buddy gets.
      </>
    ),
  },
  {
    icon: '🦔',
    title: 'Your Cozy Companion',
    body: (
      <>
        Meet your buddy — a small, round creature who lives on your screen while you work.
        Keep them happy by <span className={styles.slideHighlight}>using items from the store</span>.
        They'll cheer you on every step of the way!
      </>
    ),
  },
];

export function OnboardingPage() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  async function finish() {
    setIsFinishing(true);
    try {
      await userApi.patchOnboarding();
      updateUser({ hasSeenOnboarding: true });
    } catch { /* non-fatal */ }
    navigate('/', { replace: true });
  }

  function next() {
    if (isLast) finish();
    else setSlide(s => s + 1);
  }

  return (
    <div className={styles.page}>
      <button className={styles.skipBtn} onClick={finish}>Skip</button>

      <div className={styles.card}>
        <div className={styles.slideArea} key={slide}>
          <div className={styles.slideIcon}>{current.icon}</div>
          <div className={styles.slideTitle}>{current.title}</div>
          <div className={styles.slideBody}>{current.body}</div>
        </div>

        <div className={styles.dots}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i === slide ? styles.active : ''}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>

        <div className={styles.nav}>
          {slide > 0 && (
            <button className={styles.btnSecondary} onClick={() => setSlide(s => s - 1)}>
              Back
            </button>
          )}
          <button className={styles.btnPrimary} onClick={next} disabled={isFinishing}>
            {isLast ? (isFinishing ? 'Starting…' : "Let's go!") : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

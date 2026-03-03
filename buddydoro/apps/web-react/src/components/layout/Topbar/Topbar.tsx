import { useState, useRef, useLayoutEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, User, Settings, LogOut, Target, ListChecks } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCurrencyStore } from '../../../stores/currencyStore';
import { useInventoryStore } from '../../../stores/inventoryStore';
import { GoalsAccordion } from '../../tasks/GoalsAccordion';
import { FocusedTasksView } from '../../tasks/FocusedTasksView';
import styles from './Topbar.module.css';

export function Topbar() {
  return (
    <div className={styles.topbar}>
      <GreetChip />
      <div className={styles.spacer} />
      <DorosChip />
      <DiamondChip />
      <StoreChip />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good night';
}

function GreetChip() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'goals' | 'tasks'>('goals');
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  // Panel is position:absolute so it doesn't affect the button's width.
  // We can now correctly measure the button's natural size and store it
  // as a CSS var so the width transition has a concrete from-value.
  useLayoutEffect(() => {
    const btn = btnRef.current;
    const wrap = wrapRef.current;
    if (btn && wrap) {
      wrap.style.setProperty('--pill-width', `${btn.offsetWidth}px`);
    }
  }, [user?.name]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} />}

      <div
        ref={wrapRef}
        className={`${styles.greetWrap} ${open ? styles.greetOpen : ''}`}
      >
        {/* The pill button — only this affects the wrapper's layout width */}
        <button
          ref={btnRef}
          className={styles.greetBubble}
          onClick={() => setOpen(v => !v)}
          aria-label="Open tasks & menu"
          aria-expanded={open}
        >
          <div className={styles.greetAvatar}>{initial}</div>
          <span>{user?.name ?? 'Hey!'}</span>
        </button>

        {/* Panel is absolute — invisible to button's size calculation */}
        <div className={styles.panel}>
          <div className={styles.panelInner}>
            <div className={styles.panelHeader}>
              <div className={styles.panelGreeting}>
                <span className={styles.greetingLabel}>{getGreeting()},</span>
                <span className={styles.greetingName}>{user?.name ?? 'friend'}!</span>
              </div>
            </div>

            <div className={styles.panelNav}>
              <Link to="/profile" className={styles.navBtn} onClick={() => setOpen(false)}>
                <User size={14} /> Profile
              </Link>
              <Link to="/account" className={styles.navBtn} onClick={() => setOpen(false)}>
                <Settings size={14} /> Account
              </Link>
              <button className={`${styles.navBtn} ${styles.danger}`} onClick={handleLogout}>
                <LogOut size={14} /> Sign out
              </button>
            </div>

            <div className={styles.panelTabs}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'goals' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('goals')}
              >
                <Target size={13} /> Goals
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'tasks' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                <ListChecks size={13} /> Tasks
              </button>
            </div>

            <div className={styles.panelContent}>
              {activeTab === 'goals' ? <GoalsAccordion /> : <FocusedTasksView />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DorosChip() {
  const doros = useCurrencyStore(s => s.doros);
  return (
    <div className={styles.chip}>
      <span className={styles.chipIcon}>🌰</span>
      <span className={styles.chipValue}>{doros.toLocaleString()}</span>
    </div>
  );
}

function DiamondChip() {
  const diamonds = useCurrencyStore(s => s.diamonds);
  return (
    <div className={styles.chip}>
      <span className={styles.chipIcon}>💎</span>
      <span className={styles.chipValue}>{diamonds}</span>
    </div>
  );
}

function StoreChip() {
  const openStore = useInventoryStore(s => s.openStore);
  return (
    <button className={`${styles.chip} ${styles.storeChip}`} onClick={openStore}>
      <ShoppingBag size={14} />
      <span>Shop</span>
    </button>
  );
}

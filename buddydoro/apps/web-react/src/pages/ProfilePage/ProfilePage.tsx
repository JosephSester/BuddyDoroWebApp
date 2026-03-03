import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import { useCompanionStore, COMPANION_THEMES } from '../../stores/companionStore';
import type { CompanionType } from '../../stores/companionStore';
import { HedgehogSVG } from '../../components/companion/HedgehogSVG';
import { FoxSVG } from '../../components/companion/FoxSVG';
import { BearCubSVG } from '../../components/companion/BearCubSVG';
import styles from './ProfilePage.module.css';

const COMPANIONS: CompanionType[] = ['hedgehog', 'fox', 'bear'];

const SCENE_LABELS: Record<string, string> = {
  autumn: 'Autumn forest',
  woodland: 'Misty woodland',
  winter: 'Snowy cabin',
};

function CompanionPreview({ type }: { type: CompanionType }) {
  if (type === 'fox') return <FoxSVG eyeState="open" />;
  if (type === 'bear') return <BearCubSVG eyeState="open" />;
  return <HedgehogSVG eyeState="open" />;
}

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { companionType, setCompanionType } = useCompanionStore();
  const [name, setName] = useState(user?.name ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.name) return;
    setStatus('saving');
    try {
      const res = await authApi.updateProfile(trimmed);
      updateUser({ name: res.user.name });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.backLink}>← Back</Link>
        <h1 className={styles.heading}>Your Profile</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="profile-name">Display name</label>
            <input
              id="profile-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} type="email" value={user?.email ?? ''} disabled />
          </div>

          {status === 'saved' && <span className={styles.success}>Saved!</span>}
          {status === 'error' && <span className={styles.error}>Failed to save. Please try again.</span>}

          <button className={styles.saveBtn} type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <hr className={styles.divider} />

        {/* Companion picker */}
        <div>
          <div className={styles.sectionTitle}>Your companion</div>
          <div className={styles.companionGrid}>
            {COMPANIONS.map(type => {
              const info = COMPANION_THEMES[type];
              return (
                <button
                  key={type}
                  className={`${styles.companionCard} ${companionType === type ? styles.selected : ''}`}
                  onClick={() => setCompanionType(type)}
                >
                  <div className={styles.companionCardSvg}>
                    <CompanionPreview type={type} />
                  </div>
                  <div className={styles.companionCardName}>{info.name}</div>
                  <div className={styles.companionCardScene}>{SCENE_LABELS[info.scene]}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

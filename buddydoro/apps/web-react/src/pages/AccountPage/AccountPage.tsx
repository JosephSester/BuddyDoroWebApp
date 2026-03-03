import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import styles from '../ProfilePage/ProfilePage.module.css';

export function AccountPage() {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSaved('');

    if (newPw && newPw !== confirmPw) { setError('Passwords do not match'); return; }
    if (newPw && newPw.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!currentPw) { setError('Current password is required to make changes'); return; }

    setIsSaving(true);
    try {
      await authApi.updateAccount({
        email: newEmail.trim() || undefined,
        currentPassword: currentPw,
        newPassword: newPw || undefined,
      });
      setSaved('Account updated!');
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setNewEmail('');
      setTimeout(() => setSaved(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.backLink}>← Back</Link>
        <h1 className={styles.heading}>Account settings</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Current email</label>
            <input className={styles.input} type="email" value={user?.email ?? ''} disabled />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="acc-email">New email (optional)</label>
            <input id="acc-email" className={styles.input} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Leave blank to keep current" />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="acc-curpw">Current password *</label>
            <input id="acc-curpw" className={styles.input} type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Required to save changes" />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="acc-newpw">New password (optional)</label>
            <input id="acc-newpw" className={styles.input} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Leave blank to keep current" />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="acc-confirm">Confirm new password</label>
            <input id="acc-confirm" className={styles.input} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
          </div>

          {error && <span className={styles.error}>{error}</span>}
          {saved && <span className={styles.success}>{saved}</span>}

          <button className={styles.saveBtn} type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

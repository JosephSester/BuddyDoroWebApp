import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already logged in
  if (user) {
    navigate(user.hasSeenOnboarding ? '/' : '/onboarding', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }

    setIsSubmitting(true);
    try {
      const res = await authApi.login(email.trim(), password);
      login(res.token, res.user);
      navigate(res.user.hasSeenOnboarding ? '/' : '/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🍵</div>
          <div className={styles.logoTitle}>BuddyDoro</div>
          <div className={styles.logoSubtitle}>Your cozy focus companion</div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <div className={styles.globalError}>{error}</div>}

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button className={styles.submitBtn} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className={styles.footer}>
          Don't have an account?{' '}
          <Link to="/signup" className={styles.footerLink}>Create one</Link>
        </div>
      </div>
    </div>
  );
}

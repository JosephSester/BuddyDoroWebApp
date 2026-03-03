import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import styles from '../LoginPage/LoginPage.module.css';

export function SignupPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!confirm) e.confirm = 'Please confirm your password';
    else if (confirm !== password) e.confirm = 'Passwords do not match';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await authApi.signup(name.trim(), email.trim(), password);
      login(res.token, res.user);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setErrors({ global: err instanceof Error ? err.message : 'Sign up failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🌿</div>
          <div className={styles.logoTitle}>Join BuddyDoro</div>
          <div className={styles.logoSubtitle}>Start your cozy focus journey</div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {errors.global && <div className={styles.globalError}>{errors.global}</div>}

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="signup-name">Name</label>
            <input
              id="signup-name"
              className={`${styles.input} ${errors.name ? styles.error : ''}`}
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
            {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              className={`${styles.input} ${errors.email ? styles.error : ''}`}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              className={`${styles.input} ${errors.password ? styles.error : ''}`}
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="signup-confirm">Confirm Password</label>
            <input
              id="signup-confirm"
              className={`${styles.input} ${errors.confirm ? styles.error : ''}`}
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {errors.confirm && <span className={styles.fieldError}>{errors.confirm}</span>}
          </div>

          <button className={styles.submitBtn} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.footerLink}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}

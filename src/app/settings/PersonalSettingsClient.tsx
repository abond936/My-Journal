'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import styles from './settings.module.css';

type AccountSummary = {
  username: string;
  displayName: string;
  role: 'admin' | 'viewer';
  accessKind: 'account' | 'guest';
};

export default function PersonalSettingsClient({ account }: { account: AccountSummary }) {
  const { theme, setThemePreference } = useTheme();
  const feedback = useAppFeedback();
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [conversionBusy, setConversionBusy] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  async function chooseTheme(nextTheme: 'light' | 'dark') {
    if (saving || nextTheme === theme) return;
    setSaving(true);
    const saved = await setThemePreference(nextTheme);
    setSaving(false);
    if (saved) {
      feedback.showSuccess(`${nextTheme === 'light' ? 'Light' : 'Dark'} appearance saved.`);
    } else {
      feedback.showError('Appearance changed on this browser but could not be saved to your account.');
    }
  }

  async function convertGuestAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (conversionBusy) return;
    if (password.length < 8) {
      setConversionError('Use at least 8 characters.');
      return;
    }
    if (password !== passwordConfirmation) {
      setConversionError('The passwords do not match.');
      return;
    }
    setConversionBusy(true);
    setConversionError(null);
    try {
      const response = await fetch('/api/account/convert-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'The password account could not be created.');
      feedback.showSuccess('Password account created. Sign in with your email and new password.');
      await signOut({ callbackUrl: '/login?callbackUrl=%2Faccount' });
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : 'The password account could not be created.');
      setConversionBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Account</h1>

      <section className={styles.section} aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.choiceGroup} role="radiogroup" aria-label="Appearance">
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={theme === mode}
              className={`${styles.choice} ${theme === mode ? styles.choiceSelected : ''}`}
              disabled={saving}
              onClick={() => void chooseTheme(mode)}
            >
              {mode === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="account-heading">
        <h2 id="account-heading" className={styles.sectionTitle}>Account</h2>
        <dl className={styles.accountList}>
          <div><dt>Name</dt><dd>{account.displayName}</dd></div>
          <div><dt>Username</dt><dd>{account.username}</dd></div>
          <div><dt>Role</dt><dd>{account.role === 'admin' ? 'Administrator' : 'Reader'}</dd></div>
        </dl>
        {account.accessKind === 'guest' ? (
          <form className={styles.conversionForm} onSubmit={convertGuestAccount}>
            <h3 className={styles.conversionTitle}>Create a password account</h3>
            <p className={styles.conversionCopy}>
              Keep the same Reader access and sign in later with {account.username}.
            </p>
            <label className={styles.field}>
              <span>Password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={conversionBusy}
              />
            </label>
            <label className={styles.field}>
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                disabled={conversionBusy}
              />
            </label>
            {conversionError ? <p className={styles.fieldError} role="alert">{conversionError}</p> : null}
            <button type="submit" className={styles.convertButton} disabled={conversionBusy}>
              {conversionBusy ? 'Creating account…' : 'Create password account'}
            </button>
          </form>
        ) : null}
        <button type="button" className={styles.signOutButton} onClick={() => signOut({ callbackUrl: '/' })}>
          Sign out
        </button>
      </section>
    </main>
  );
}

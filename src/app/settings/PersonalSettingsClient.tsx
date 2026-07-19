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
};

export default function PersonalSettingsClient({ account }: { account: AccountSummary }) {
  const { theme, setThemePreference } = useTheme();
  const feedback = useAppFeedback();
  const [saving, setSaving] = useState(false);

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
        <button type="button" className={styles.signOutButton} onClick={() => signOut({ callbackUrl: '/' })}>
          Sign out
        </button>
      </section>
    </main>
  );
}

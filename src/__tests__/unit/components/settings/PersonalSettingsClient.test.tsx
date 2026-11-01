import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PersonalSettingsClient from '@/app/settings/PersonalSettingsClient';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';

import { signOut } from 'next-auth/react';

jest.mock('next-auth/react', () => ({ signOut: jest.fn() }));
jest.mock('@/components/providers/ThemeProvider', () => ({ useTheme: jest.fn() }));
jest.mock('@/components/providers/AppFeedbackProvider', () => ({ useAppFeedback: jest.fn() }));

const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockedFeedback = useAppFeedback as jest.MockedFunction<typeof useAppFeedback>;

describe('PersonalSettingsClient', () => {
  it('shows account details and saves a personal appearance choice', async () => {
    const setThemePreference = jest.fn().mockResolvedValue(true);
    const showSuccess = jest.fn();
    mockedUseTheme.mockReturnValue({ theme: 'dark', setThemePreference } as never);
    mockedFeedback.mockReturnValue({ showSuccess, showError: jest.fn() } as never);

    render(<PersonalSettingsClient account={{ username: 'reader', displayName: 'A Reader', role: 'viewer', accessKind: 'account' }} />);
    expect(screen.getByText('A Reader')).toBeInTheDocument();
    expect(screen.getByText('Reader')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    await waitFor(() => expect(setThemePreference).toHaveBeenCalledWith('light'));
    expect(showSuccess).toHaveBeenCalledWith('Light appearance saved.');
  });

  it('lets the signed-in guest establish a password on the same account', async () => {
    const showSuccess = jest.fn();
    mockedUseTheme.mockReturnValue({ theme: 'light', setThemePreference: jest.fn() } as never);
    mockedFeedback.mockReturnValue({ showSuccess, showError: jest.fn() } as never);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    (signOut as jest.Mock).mockResolvedValue(undefined);

    render(<PersonalSettingsClient account={{
      username: 'guest@example.com', displayName: 'Guest', role: 'viewer', accessKind: 'guest',
    }} />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'new-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create password account' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/account/convert-guest',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ password: 'new-password' }) })
    ));
    expect(showSuccess).toHaveBeenCalledWith(
      'Password account created. Sign in with your email and new password.'
    );
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login?callbackUrl=%2Faccount' });
  });
});

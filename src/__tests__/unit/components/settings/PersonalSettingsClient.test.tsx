import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PersonalSettingsClient from '@/app/settings/PersonalSettingsClient';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';

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

    render(<PersonalSettingsClient account={{ username: 'reader', displayName: 'A Reader', role: 'viewer' }} />);
    expect(screen.getByText('A Reader')).toBeInTheDocument();
    expect(screen.getByText('Reader')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    await waitFor(() => expect(setThemePreference).toHaveBeenCalledWith('light'));
    expect(showSuccess).toHaveBeenCalledWith('Light appearance saved.');
  });
});

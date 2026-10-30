import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Home from '@/components/view/Home';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  getSession: jest.fn(),
  signIn: jest.fn(),
  useSession: jest.fn(),
}));

jest.mock('@/components/providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ showError: jest.fn() }),
}));

const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockedUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('Home authenticated entry', () => {
  const replace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRouter.mockReturnValue({ replace } as never);
    mockedUseSearchParams.mockReturnValue(new URLSearchParams() as never);
  });

  it('sends an administrator without a callback to Author Home', async () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { role: 'admin' } },
      update: jest.fn(),
    } as never);

    render(<Home />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
  });

  it('preserves an explicit Reader callback for an administrator', async () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams('callbackUrl=%2Fview%3Fmode%3Dfreeform') as never
    );
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { role: 'admin' } },
      update: jest.fn(),
    } as never);

    render(<Home />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/view?mode=freeform'));
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { signIn, useSession } from 'next-auth/react';
import InviteAcceptClient from '@/app/(marketing)/invite/InviteAcceptClient';

const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
jest.mock('next-auth/react', () => ({ signIn: jest.fn(), useSession: jest.fn() }));

const signInMock = jest.mocked(signIn);
const useSessionMock = jest.mocked(useSession);

describe('InviteAcceptClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/invite');
    useSessionMock.mockReturnValue({ data: null, status: 'unauthenticated', update: jest.fn() } as never);
  });

  it('removes the token from the address and redeems it once', async () => {
    window.history.replaceState({}, '', '/invite#token=private-token');
    signInMock.mockResolvedValue({ ok: true, status: 200, error: null, url: '/view' });
    const { rerender } = render(<InviteAcceptClient />);
    rerender(<InviteAcceptClient />);

    await waitFor(() => expect(signInMock).toHaveBeenCalledTimes(1));
    expect(signInMock).toHaveBeenCalledWith('guest-invite', {
      token: 'private-token', redirect: false, callbackUrl: '/view',
    });
    expect(window.location.hash).toBe('');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/view'));
  });

  it('shows a safe error when the link cannot be redeemed', async () => {
    window.history.replaceState({}, '', '/invite#token=expired');
    signInMock.mockResolvedValue({ ok: false, status: 401, error: 'CredentialsSignin', url: null });
    render(<InviteAcceptClient />);
    expect(await screen.findByText('This invitation cannot be used')).toBeInTheDocument();
    expect(screen.getByText(/invalid, expired, or has already been used/)).toBeInTheDocument();
  });
});

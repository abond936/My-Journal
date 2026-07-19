import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Navigation from '@/components/common/Navigation';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

jest.mock('next-auth/react', () => ({ useSession: jest.fn(), signOut: jest.fn() }));
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt?: string }) => <span role="img" aria-label={props.alt} />,
}));
jest.mock('@/components/common/ThemeToggle', () => ({ ThemeToggle: () => <button>Light</button> }));
jest.mock('@/components/providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark', isThemeAdminOpen: false, openThemeAdmin: jest.fn() }),
}));

const mockedSession = useSession as jest.MockedFunction<typeof useSession>;
const mockedPathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('Navigation hierarchy', () => {
  beforeEach(() => {
    mockedPathname.mockReturnValue('/view');
    window.history.replaceState({}, '', '/view');
  });

  it('orders the administrator menu and removes development destinations', () => {
    mockedSession.mockReturnValue({ data: { user: { role: 'admin' } } } as never);
    render(<Navigation />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));

    const labels = screen.getAllByRole('link').map((link) => link.textContent?.trim()).filter(Boolean);
    expect(labels).toEqual([
      'Home', 'Reader', 'Studio', 'Users', 'Settings', 'Theme', 'Account',
    ]);
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
    expect(screen.queryByText('Landing Page 1')).toBeNull();
  });

  it('hides administrator destinations from viewing users', () => {
    mockedSession.mockReturnValue({ data: { user: { role: 'viewer' } } } as never);
    render(<Navigation />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reader' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Studio' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
  });

  it('uses a safe contextual return and rejects external return input', async () => {
    mockedSession.mockReturnValue({ data: { user: { role: 'viewer' } } } as never);
    mockedPathname.mockReturnValue('/view/card-1');
    window.history.replaceState({}, '', '/view/card-1?returnTo=%2Fsearch%3Fq%3Dfamily');
    const { rerender } = render(<Navigation />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/search?q=family');
    });

    window.history.replaceState({}, '', '/view/card-2?returnTo=https%3A%2F%2Fevil.test');
    mockedPathname.mockReturnValue('/view/card-2');
    rerender(<Navigation />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/view');
    });
  });
});

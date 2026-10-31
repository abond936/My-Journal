import { render, screen } from '@testing-library/react';
import { usePathname, useRouter } from 'next/navigation';
import AdminDesktopOnlyGate from '@/components/admin/AdminDesktopOnlyGate';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

const mockedUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

function setViewport(desktop: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({
    matches: desktop,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
}

describe('AdminDesktopOnlyGate', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ push: jest.fn() } as never);
    setViewport(false);
  });

  it.each(['/admin', '/admin/studio'])(
    'allows the approved mobile Author surface at %s',
    (pathname) => {
      mockedUsePathname.mockReturnValue(pathname);

      render(
        <AdminDesktopOnlyGate allowMobileAuthorPaths>
          <div>Author surface</div>
        </AdminDesktopOnlyGate>
      );

      expect(screen.getByText('Author surface')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).toBeNull();
    }
  );

  it('retains the mobile blocker for desktop-only Administration', () => {
    mockedUsePathname.mockReturnValue('/admin/settings');

    render(
      <AdminDesktopOnlyGate allowMobileAuthorPaths>
        <div>Settings</div>
      </AdminDesktopOnlyGate>
    );

    expect(screen.getByRole('dialog')).toHaveTextContent('Admin only available on desktop.');
  });

  it('does not make a Theme overlay mobile-capable merely because Studio is open', () => {
    mockedUsePathname.mockReturnValue('/admin/studio');

    render(
      <AdminDesktopOnlyGate>
        <div>Theme editor</div>
      </AdminDesktopOnlyGate>
    );

    expect(screen.getByRole('dialog')).toHaveTextContent('Admin only available on desktop.');
  });

  it('allows every Administration surface at desktop width', () => {
    setViewport(true);
    mockedUsePathname.mockReturnValue('/admin/settings');

    render(
      <AdminDesktopOnlyGate allowMobileAuthorPaths>
        <div>Settings</div>
      </AdminDesktopOnlyGate>
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

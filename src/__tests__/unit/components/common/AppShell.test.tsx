import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AppShell from '@/components/common/AppShell';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/components/common/Navigation', () => ({
  __esModule: true,
  default: ({ sidebarOpen }: { sidebarOpen: boolean }) => (
    <div data-testid="navigation" data-sidebar-open={String(sidebarOpen)} />
  ),
}));

jest.mock('@/components/common/GlobalSidebar', () => ({
  __esModule: true,
  default: ({ isOpen, onRequestClose }: { isOpen: boolean; onRequestClose?: () => void }) => (
    <aside data-testid="global-sidebar" data-open={String(isOpen)}>
      <button type="button" onClick={onRequestClose}>Guided destination</button>
    </aside>
  ),
}));

jest.mock('@/components/common/LazyThemeAdminOverlay', () => ({
  __esModule: true,
  default: () => <div data-testid="theme-admin-overlay" />,
}));

const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockedUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: jest.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      }),
      removeEventListener: jest.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      }),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe('AppShell mobile sidebar drawer', () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { role: 'viewer' } },
      update: jest.fn(),
    } as never);
    mockedUsePathname.mockReturnValue('/view');
  });

  it('leaves the mobile left edge available to browser navigation', async () => {
    mockMatchMedia(true);

    render(
      <AppShell>
        <div>Reader content</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(screen.getByTestId('global-sidebar')).toHaveAttribute('data-open', 'false');
    });

    expect(screen.queryByTestId('mobile-swipe-edge-zone')).toBeNull();
    fireEvent.touchStart(screen.getByText('Reader content'), {
      touches: [{ clientX: 8, clientY: 120 }],
    });
    fireEvent.touchMove(screen.getByText('Reader content'), {
      touches: [{ clientX: 58, clientY: 124 }],
    });
    fireEvent.touchEnd(screen.getByText('Reader content'), {
      changedTouches: [{ clientX: 82, clientY: 126 }],
    });

    await waitFor(() => {
      expect(screen.getByTestId('global-sidebar')).toHaveAttribute('data-open', 'false');
    });
  });

  it('opens from the protected inset swipe zone without using the browser edge', async () => {
    mockMatchMedia(true);

    render(
      <AppShell>
        <div>Reader content</div>
      </AppShell>
    );

    fireEvent.touchStart(screen.getByText('Reader content'), {
      touches: [{ clientX: 42, clientY: 120 }],
    });
    fireEvent.touchEnd(screen.getByText('Reader content'), {
      changedTouches: [{ clientX: 112, clientY: 124 }],
    });

    await waitFor(() => {
      expect(screen.getByTestId('global-sidebar')).toHaveAttribute('data-open', 'true');
    });
  });

  it('does not open for vertically dominant movement in the inset zone', async () => {
    mockMatchMedia(true);

    render(
      <AppShell>
        <div>Reader content</div>
      </AppShell>
    );

    fireEvent.touchStart(screen.getByText('Reader content'), {
      touches: [{ clientX: 42, clientY: 100 }],
    });
    fireEvent.touchEnd(screen.getByText('Reader content'), {
      changedTouches: [{ clientX: 102, clientY: 190 }],
    });

    await waitFor(() => {
      expect(screen.getByTestId('global-sidebar')).toHaveAttribute('data-open', 'false');
    });
  });

  it('closes the mobile sidebar with a left swipe while open', async () => {
    mockMatchMedia(true);

    render(
      <AppShell>
        <div>Reader content</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    await waitFor(() => {
      expect(screen.getByTestId('global-sidebar')).toHaveAttribute('data-open', 'true');
    });

    fireEvent.touchStart(screen.getByTestId('global-sidebar'), {
      touches: [{ clientX: 180, clientY: 120 }],
    });
    fireEvent.touchEnd(screen.getByTestId('global-sidebar'), {
      changedTouches: [{ clientX: 80, clientY: 126 }],
    });

    await waitFor(() => {
      expect(screen.getByTestId('global-sidebar')).toHaveAttribute('data-open', 'false');
    });
  });

  it('keeps the desktop toggle available on desktop viewports', () => {
    mockMatchMedia(false);

    render(
      <AppShell>
        <div>Reader content</div>
      </AppShell>
    );

    expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeInTheDocument();
  });

  it('keeps reader shell chrome visible while session is loading on protected routes', () => {
    mockMatchMedia(true);
    mockedUseSession.mockReturnValue({
      status: 'loading',
      data: null,
      update: jest.fn(),
    } as never);
    mockedUsePathname.mockReturnValue('/view');

    render(
      <AppShell>
        <div>Reader content</div>
      </AppShell>
    );

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(screen.getByTestId('global-sidebar')).toBeInTheDocument();
  });

  it('lets a mobile Guided destination request that the drawer close', async () => {
    mockMatchMedia(true);

    render(
      <AppShell>
        <div>Reader content</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guided destination' }));

    await waitFor(() => {
      expect(screen.getByTestId('global-sidebar')).toHaveAttribute('data-open', 'false');
    });
  });

  it('keeps the Studio sidebar available but removes Reader chrome from specialist admin pages', async () => {
    mockMatchMedia(false);
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { role: 'admin' } },
      update: jest.fn(),
    } as never);
    mockedUsePathname.mockReturnValue('/admin/studio');

    const { rerender } = render(
      <AppShell>
        <div>Admin content</div>
      </AppShell>
    );

    expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeTruthy();
    expect(screen.getByTestId('global-sidebar')).toBeTruthy();

    mockedUsePathname.mockReturnValue('/admin/settings');
    rerender(
      <AppShell>
        <div>Admin content</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Toggle sidebar' })).toBeNull();
      expect(screen.queryByTestId('global-sidebar')).toBeNull();
    });
  });
});

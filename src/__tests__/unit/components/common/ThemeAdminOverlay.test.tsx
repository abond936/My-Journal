import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/providers/ThemeProvider';
import ThemeAdminOverlay from '@/components/common/ThemeAdminOverlay';
import { readFileSync } from 'fs';
import path from 'path';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/components/providers/ThemeProvider', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@/components/admin/AdminDesktopOnlyGate', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="desktop-gate">{children}</div>
  ),
}));

jest.mock('@/components/admin/theme-admin/ThemeAdminPage', () => ({
  __esModule: true,
  default: () => <div>Theme editor</div>,
}));

const mockedUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('ThemeAdminOverlay shell boundary', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockedUseTheme.mockReturnValue({
      isThemeAdminOpen: true,
      closeThemeAdmin: jest.fn(),
    } as never);
  });

  it('uses the existing Administration desktop gate on admin routes', async () => {
    mockedUsePathname.mockReturnValue('/admin/studio');
    render(<ThemeAdminOverlay />);

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Theme Management workbench' })).toBeTruthy());
    expect(screen.queryByTestId('desktop-gate')).toBeNull();
  });

  it('provides its own desktop gate when opened from Reader', async () => {
    mockedUsePathname.mockReturnValue('/view');
    render(<ThemeAdminOverlay />);

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Theme Management workbench' })).toBeTruthy());
    expect(screen.getByTestId('desktop-gate')).toBeTruthy();
  });

  it('keeps Reader aliases out of the Administration workbench chrome', () => {
    const css = readFileSync(path.join(
      process.cwd(),
      'src/components/admin/theme-admin/ThemeAdmin.module.css',
    ), 'utf8');
    const workbenchStart = css.indexOf('.architectureWorkbench {');
    const readerPreviewStart = css.indexOf('.readerPreviewHeader {');
    expect(workbenchStart).toBeGreaterThanOrEqual(0);
    expect(readerPreviewStart).toBeGreaterThan(workbenchStart);
    expect(css.slice(workbenchStart, readerPreviewStart)).not.toContain('var(--reader-');
  });
});

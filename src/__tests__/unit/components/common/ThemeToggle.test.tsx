import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useTheme } from '@/components/providers/ThemeProvider';

jest.mock('@/components/providers/ThemeProvider', () => ({ useTheme: jest.fn() }));

const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('ThemeToggle', () => {
  it('offers Light with a sun when Dark is active', () => {
    const toggleTheme = jest.fn();
    mockedUseTheme.mockReturnValue({ theme: 'dark', toggleTheme } as never);
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Light' }));
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('offers Dark with a moon when Light is active', () => {
    mockedUseTheme.mockReturnValue({ theme: 'light', toggleTheme: jest.fn() } as never);
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to Dark' })).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });
});

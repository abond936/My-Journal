import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ReaderHome from '@/components/view/ReaderHome';
import { useCardContext } from '@/components/providers/CardProvider';
import { READER_LAST_MODE_KEY } from '@/lib/utils/readerEntry';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/components/providers/CardProvider', () => ({ useCardContext: jest.fn() }));

const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockedUseCardContext = useCardContext as jest.MockedFunction<typeof useCardContext>;

describe('ReaderHome', () => {
  const push = jest.fn();
  const setReaderMode = jest.fn();
  const setActiveDimension = jest.fn();
  const setCollectionId = jest.fn();

  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    mockedUseRouter.mockReturnValue({ push } as never);
    mockedUseCardContext.mockReturnValue({
      readerMode: 'guided',
      setReaderMode,
      setActiveDimension,
      setCollectionId,
    } as never);
  });

  it('offers Collections and Feed without inventing Continue on first entry', () => {
    render(<ReaderHome />);

    expect(screen.getByRole('heading', { name: 'Where would you like to begin?' })).toBeVisible();
    expect(screen.queryByText('Continue reading')).toBeNull();
    expect(screen.getByRole('button', { name: /Collections/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Feed/ })).toBeVisible();
  });

  it('opens the existing explicit Collections path and resets to its overview', () => {
    render(<ReaderHome />);

    fireEvent.click(screen.getByRole('button', { name: /Collections/ }));

    expect(setActiveDimension).toHaveBeenCalledWith('collections');
    expect(setCollectionId).toHaveBeenCalledWith(null);
    expect(push).toHaveBeenCalledWith('/view?mode=guided');
    expect(window.localStorage.getItem(READER_LAST_MODE_KEY)).toBe('guided');
  });

  it('offers Continue only for a remembered reading path and preserves its context', () => {
    window.localStorage.setItem(READER_LAST_MODE_KEY, 'freeform');
    mockedUseCardContext.mockReturnValue({
      readerMode: 'freeform',
      setReaderMode,
      setActiveDimension,
      setCollectionId,
    } as never);

    render(<ReaderHome />);
    fireEvent.click(screen.getByRole('button', { name: /Return to Feed/ }));

    expect(setReaderMode).not.toHaveBeenCalled();
    expect(setActiveDimension).not.toHaveBeenCalled();
    expect(setCollectionId).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/view?mode=freeform');
  });
});

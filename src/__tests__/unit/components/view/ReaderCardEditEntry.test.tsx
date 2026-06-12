import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ReaderCardEditEntry from '@/components/view/ReaderCardEditEntry';

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicStub({ children }: { children?: React.ReactNode; open?: boolean }) {
      return children ? <>{children}</> : null;
    },
}));

describe('ReaderCardEditEntry', () => {
  it('calls onBeforeOpen when the trigger is clicked', () => {
    const onBeforeOpen = jest.fn();

    render(
      <ReaderCardEditEntry
        cardId="card-1"
        returnTo="/view"
        metadata={{ title: 'Title', subtitle: '', excerpt: '', content: '' }}
        onBeforeOpen={onBeforeOpen}
      >
        Edit
      </ReaderCardEditEntry>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onBeforeOpen).toHaveBeenCalledTimes(1);
  });
});

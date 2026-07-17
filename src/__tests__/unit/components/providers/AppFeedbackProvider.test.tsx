import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AppFeedbackProvider, useAppFeedback } from '@/components/providers/AppFeedbackProvider';

function FeedbackHarness() {
  const feedback = useAppFeedback();
  return (
    <>
      <button type="button" onClick={() => feedback.showSuccess('Card saved.')}>Success</button>
      <button type="button" onClick={() => feedback.showError('Your changes are still here. Try again.')}>Error</button>
    </>
  );
}

describe('AppFeedbackProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows routine success as a transient one-line status without a generic title', () => {
    render(<AppFeedbackProvider><FeedbackHarness /></AppFeedbackProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    expect(screen.getByRole('status')).toHaveTextContent('Card saved.');
    expect(screen.queryByText('Saved')).toBeNull();

    act(() => jest.advanceTimersByTime(4000));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps errors until dismissed and announces them assertively without a generic heading', () => {
    render(<AppFeedbackProvider><FeedbackHarness /></AppFeedbackProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Error' }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Your changes are still here. Try again.');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(screen.queryByText('Something went wrong')).toBeNull();

    act(() => jest.advanceTimersByTime(10000));
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

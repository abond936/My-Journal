import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileStoryFlowNav from '@/components/admin/studio/cards/MobileStoryFlowNav';

describe('MobileStoryFlowNav', () => {
  it('presents the approved Story sequence and moves to the selected section', async () => {
    const user = userEvent.setup();
    const onStepChange = jest.fn();

    render(<MobileStoryFlowNav activeStep="words" onStepChange={onStepChange} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Words',
      'Media',
      'Details',
      'Placement',
      'Preview',
    ]);

    await user.click(screen.getByRole('button', { name: 'Placement' }));
    expect(onStepChange).toHaveBeenCalledWith('placement');
    expect(screen.getByRole('button', { name: 'Words' })).toHaveAttribute('aria-current', 'step');
  });
});

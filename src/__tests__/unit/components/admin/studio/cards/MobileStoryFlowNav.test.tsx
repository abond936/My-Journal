import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileStoryFlowNav from '@/components/admin/studio/cards/MobileStoryFlowNav';

describe('MobileStoryFlowNav', () => {
  it('presents the approved Story sequence and moves to the selected section', async () => {
    const user = userEvent.setup();
    const target = document.createElement('section');
    target.id = 'mobile-story-placement';
    target.scrollIntoView = jest.fn();
    document.body.appendChild(target);

    render(<MobileStoryFlowNav />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Words',
      'Media',
      'Details',
      'Placement',
      'Preview',
    ]);

    await user.click(screen.getByRole('button', { name: 'Placement' }));
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    target.remove();
  });
});

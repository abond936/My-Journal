import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TipTapStaticContent from '@/components/common/TipTapStaticContent';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('TipTapStaticContent', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders normalized HTML without mounting an editor', () => {
    render(<TipTapStaticContent content="<p>Static inline body</p>" headingVariant="story" />);
    expect(screen.getByText('Static inline body')).toBeInTheDocument();
  });

  it('navigates to card detail when a card mention is clicked', () => {
    render(
      <TipTapStaticContent
        content='<p><span data-type="cardMention" data-card-id="card-99" data-label="Mentioned card" class="card-inline-link" role="link" tabindex="0">@Mentioned card</span></p>'
        headingVariant="question"
      />
    );

    fireEvent.click(screen.getByText('@Mentioned card'));
    expect(mockPush).toHaveBeenCalledWith('/view/card-99');
  });
});

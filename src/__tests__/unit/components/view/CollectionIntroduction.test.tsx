import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CollectionIntroduction, {
  hasCollectionIntroduction,
} from '@/components/view/CollectionIntroduction';
import type { Card } from '@/lib/types/card';

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

jest.mock('@/components/common/TipTapStaticContent', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => <div data-testid="introduction-prose">{content}</div>,
}));

jest.mock('@/components/view/InlineGallery', () => ({
  __esModule: true,
  default: ({ media }: { media: Array<{ mediaId: string }> }) => (
    <div data-testid="introduction-gallery">{media.map((item) => item.mediaId).join(',')}</div>
  ),
}));

const baseCard = {
  docId: 'parent-1',
  title: 'My Father',
  title_lowercase: 'my father',
  content: '',
  type: 'story',
  status: 'published',
  displayMode: 'navigate',
  dimensionReview: {},
  createdAt: 1,
  updatedAt: 1,
} as Card;

describe('CollectionIntroduction', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps a title-only parent as context without an introduction', () => {
    expect(hasCollectionIntroduction(baseCard)).toBe(false);
    const { container } = render(<CollectionIntroduction card={baseCard} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders authored subtitle, cover, prose, and gallery without repeating the cover', () => {
    jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(200);
    jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
    const card = {
      ...baseCard,
      subtitle: 'An introduction to his life',
      content: '<p>He taught us how to notice the small things.</p>',
      coverImageId: 'cover-1',
      coverImage: { docId: 'cover-1', url: '/cover.jpg', width: 1000, height: 700 },
      galleryMedia: [
        { mediaId: 'cover-1', order: 0, media: { docId: 'cover-1' } },
        { mediaId: 'gallery-2', order: 1, media: { docId: 'gallery-2' } },
      ],
    } as Card;

    render(<CollectionIntroduction card={card} />);

    expect(screen.getByLabelText('My Father introduction')).toBeVisible();
    expect(screen.getByText('An introduction to his life')).toBeVisible();
    expect(screen.getByRole('img', { name: 'My Father' })).toBeVisible();
    expect(screen.getByTestId('introduction-prose')).toHaveTextContent('small things');
    expect(screen.getByTestId('introduction-gallery')).toHaveTextContent('gallery-2');
    expect(screen.getByTestId('introduction-gallery')).not.toHaveTextContent('cover-1');
    expect(screen.queryByRole('button', { name: 'Continue reading' })).toBeNull();
  });

  it('expands a tall rendered introduction in place and can collapse it again', () => {
    jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(800);
    jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
    const card = { ...baseCard, content: '<p>A long introduction</p>' } as Card;

    const { rerender } = render(<CollectionIntroduction card={card} />);

    const continueButton = screen.getByRole('button', { name: 'Continue reading' });
    expect(continueButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(continueButton);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getByRole('button', { name: 'Continue reading' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Continue reading' }));
    rerender(<CollectionIntroduction card={{ ...card, subtitle: 'Updated without changing context' }} />);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
    rerender(<CollectionIntroduction card={{ ...card, docId: 'parent-2' }} />);
    expect(screen.getByRole('button', { name: 'Continue reading' })).toHaveAttribute('aria-expanded', 'false');
  });
});

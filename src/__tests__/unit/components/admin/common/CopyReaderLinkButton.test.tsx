import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CopyReaderLinkButton, { buildReaderLink } from '@/components/admin/common/CopyReaderLinkButton';

describe('CopyReaderLinkButton', () => {
  const writeText = jest.fn<Promise<void>, [string]>();

  beforeEach(() => {
    jest.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('builds only same-application Reader links', () => {
    expect(buildReaderLink('https://stories.example', '/view/card-1')).toBe('https://stories.example/view/card-1');
    expect(() => buildReaderLink('https://stories.example', 'https://elsewhere.example/card-1')).toThrow(
      'Reader links must use an internal application path.'
    );
    expect(() => buildReaderLink('https://stories.example', '//elsewhere.example/card-1')).toThrow(
      'Reader links must use an internal application path.'
    );
  });

  it('copies a direct link and states that access is unchanged', async () => {
    render(<CopyReaderLinkButton path="/view/card-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy Reader link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('http://localhost/view/card-1'));
    expect(screen.getByRole('button', { name: 'Link copied — access unchanged' })).toBeInTheDocument();
  });

  it('reports a clipboard failure without changing access', async () => {
    writeText.mockRejectedValueOnce(new Error('clipboard unavailable'));
    render(<CopyReaderLinkButton path="/view/card-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy Reader link' }));

    await waitFor(() => expect(
      screen.getByRole('button', { name: 'Copy failed — copy from Reader' })
    ).toBeInTheDocument());
  });
});

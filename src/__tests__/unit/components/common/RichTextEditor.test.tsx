import { render, waitFor } from '@testing-library/react';
import RichTextEditor from '@/components/common/RichTextEditor';

jest.mock('@/components/providers/MediaProvider', () => ({
  useMedia: () => ({
    registerCreatedMedia: jest.fn(),
  }),
}));

describe('RichTextEditor', () => {
  it('does not emit a content change on first mount for legacy inline-image markup', async () => {
    const onChange = jest.fn();
    const onContentMediaChange = jest.fn();

    render(
      <RichTextEditor
        initialContent={'<p>before</p><figure data-media-id="media-1"><img src="x" /></figure>'}
        onChange={onChange}
        onContentMediaChange={onContentMediaChange}
      />
    );

    await waitFor(() => {
      expect(document.querySelector('.ProseMirror')).toBeTruthy();
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(onContentMediaChange).not.toHaveBeenCalled();
  });
});

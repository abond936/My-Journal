import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import RichTextEditor, { type RichTextEditorRef } from '@/components/common/RichTextEditor';

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

  it('copies a library prompt into the editable Card body', async () => {
    const ref = createRef<RichTextEditorRef>();
    const onChange = jest.fn();
    render(<RichTextEditor ref={ref} initialContent="<p>Opening memory</p>" onChange={onChange} />);

    await waitFor(() => expect(ref.current).toBeTruthy());
    act(() => ref.current?.insertPrompt('What happened next?'));

    await waitFor(() => {
      expect(ref.current?.getContent()).toContain('<h3 data-prompt-block="true">What happened next?</h3>');
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('lets the author keep an editing prompt as an ordinary reader heading', async () => {
    const ref = createRef<RichTextEditorRef>();
    render(<RichTextEditor ref={ref} initialContent="<p>Opening memory</p>" />);

    await waitFor(() => expect(ref.current).toBeTruthy());
    act(() => ref.current?.insertPrompt('What happened next?'));
    const keep = await screen.findByRole('button', { name: 'Keep as reader heading' });
    fireEvent.click(keep);

    await waitFor(() => {
      expect(ref.current?.getContent()).toContain('<h3>What happened next?</h3>');
      expect(ref.current?.getContent()).not.toContain('data-prompt-block="true"');
    });
  });

  it('removes only the prompt heading while retaining authored Card text', async () => {
    const ref = createRef<RichTextEditorRef>();
    render(<RichTextEditor ref={ref} initialContent="<p>Opening memory</p>" />);

    await waitFor(() => expect(ref.current).toBeTruthy());
    act(() => ref.current?.insertPrompt('Who was there?'));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove prompt' }));

    await waitFor(() => {
      expect(ref.current?.getContent()).not.toContain('Who was there?');
      expect(ref.current?.getContent()).toContain('Opening memory');
    });
  });
});

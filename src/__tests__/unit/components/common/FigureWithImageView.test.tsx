import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FigureWithImageView } from '@/components/common/FigureWithImageView';

const setSelection = jest.fn((selection) => ({ type: 'setSelection', selection }));
const dispatch = jest.fn();
const createSelection = jest.fn((doc, pos) => ({ doc, pos, kind: 'node-selection' }));

jest.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <figure {...props}>{children}</figure>,
  NodeViewContent: ({ as: Tag = 'figcaption', className }: { as?: keyof JSX.IntrinsicElements; className?: string }) => (
    <Tag className={className} data-testid="node-view-content" />
  ),
}));

jest.mock('prosemirror-state', () => ({
  NodeSelection: {
    create: (...args: unknown[]) => createSelection(...args),
  },
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: ({ alt }: { alt?: string }) => <div aria-label={alt ?? ''} data-testid="figure-image" />,
}));

describe('FigureWithImageView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects the figure node and marks the drag as move on drag start', () => {
    const editor = {
      view: {
        state: {
          doc: { type: 'doc' },
          tr: {
            setSelection,
          },
        },
        dispatch,
      },
    };

    render(
      <FigureWithImageView
        node={{
          textContent: '',
          attrs: {
            src: 'https://example.com/image.jpg',
            alt: 'Example image',
            width: 400,
            height: 300,
            'data-size': 'medium',
            'data-alignment': 'left',
            'data-wrap': 'off',
            'data-media-id': 'media-1',
          },
        }}
        editor={editor}
        getPos={() => 12}
      />
    );

    const dragSurface = screen.getByTestId('figure-image').parentElement as HTMLDivElement;
    const dragImage = jest.fn();
    fireEvent.dragStart(dragSurface, {
      dataTransfer: {
        effectAllowed: 'all',
        setData: jest.fn(),
        setDragImage: dragImage,
      },
    });

    expect(createSelection).toHaveBeenCalledWith(editor.view.state.doc, 12);
    expect(setSelection).toHaveBeenCalledWith({ doc: editor.view.state.doc, pos: 12, kind: 'node-selection' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'setSelection', selection: { doc: editor.view.state.doc, pos: 12, kind: 'node-selection' } });
    expect(dragImage).toHaveBeenCalled();
  });

  it('marks empty captions as hidden in read-only rendering', () => {
    render(
      <FigureWithImageView
        node={{
          textContent: '',
          attrs: {
            src: 'https://example.com/image.jpg',
            alt: 'Example image',
            width: 400,
            height: 300,
            'data-size': 'medium',
            'data-alignment': 'left',
            'data-wrap': 'off',
            'data-media-id': 'media-1',
          },
        }}
        editor={{ isEditable: false }}
        getPos={() => 12}
      />
    );

    expect(screen.getByTestId('node-view-content').parentElement).toHaveAttribute(
      'data-empty-caption-hidden',
      'true'
    );
  });

  it('keeps real captions visible in read-only rendering', () => {
    render(
      <FigureWithImageView
        node={{
          textContent: 'A real caption',
          attrs: {
            src: 'https://example.com/image.jpg',
            alt: 'Example image',
            width: 400,
            height: 300,
            'data-size': 'medium',
            'data-alignment': 'left',
            'data-wrap': 'off',
            'data-media-id': 'media-1',
          },
        }}
        editor={{ isEditable: false }}
        getPos={() => 12}
      />
    );

    expect(screen.getByTestId('node-view-content').parentElement).toHaveAttribute(
      'data-empty-caption-hidden',
      'false'
    );
  });
});

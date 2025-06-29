import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FigureWithImageView } from '@/components/common/FigureWithImageView';

export interface FigureWithImageOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureWithImage: {
      setFigureWithImage: (options: { 
        src: string; 
        alt?: string; 
        caption?: string;
        width: number;
        height: number;
        mediaId?: string;
        'data-media-id'?: string;
        'data-media-type'?: string;
      }) => ReturnType;
      setFigureSize: (size: 'small' | 'medium' | 'large') => ReturnType;
      setFigureAlignment: (alignment: 'left' | 'center' | 'right') => ReturnType;
      setFigureWrap: (wrap: 'on' | 'off') => ReturnType;
      deleteFigure: () => ReturnType;
    };
  }
}

export const FigureWithImage = Node.create<FigureWithImageOptions>({
  name: 'figureWithImage',
  group: 'block',
  content: 'inline*',
  draggable: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      width: { default: null },
      height: { default: null },
      'data-size': { default: 'medium' },
      'data-alignment': { default: 'left' },
      'data-wrap': { default: 'off' },
      'data-media-id': { default: null },
      'data-media-type': { default: 'content' },
      mediaId: { 
        default: null,
        parseHTML: element => element.getAttribute('data-media-id'),
        renderHTML: attributes => ({
          'data-media-id': attributes.mediaId
        })
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-figure-with-image]',
        contentElement: 'figcaption',
        getAttrs: (element: HTMLElement) => {
          const img = element.querySelector('img');
          if (!img) {
            return {};
          }
          const mediaId = element.getAttribute('data-media-id');
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            width: parseInt(img.getAttribute('width') || '0', 10),
            height: parseInt(img.getAttribute('height') || '0', 10),
            'data-size': element.getAttribute('data-size') || 'medium',
            'data-alignment': element.getAttribute('data-alignment') || 'left',
            'data-wrap': element.getAttribute('data-wrap') || 'off',
            'data-media-id': mediaId,
            'data-media-type': element.getAttribute('data-media-type') || 'content',
            mediaId: mediaId
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const mediaId = node.attrs.mediaId || node.attrs['data-media-id'];
    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 
        'data-figure-with-image': '',
        'data-size': node.attrs['data-size'] || 'medium',
        'data-alignment': node.attrs['data-alignment'] || 'left',
        'data-wrap': node.attrs['data-wrap'] || 'off',
        'data-media-id': mediaId,
        'data-media-type': node.attrs['data-media-type'] || 'content'
      }),
      ['img', { 
        src: node.attrs.src, 
        alt: node.attrs.alt, 
        width: node.attrs.width, 
        height: node.attrs.height,
        'data-media-id': mediaId
      }],
      ['figcaption', 0],
    ];
  },

  addCommands() {
    return {
      setFigureWithImage: (options: FigureWithImageOptions) => ({ tr, dispatch }) => {
        const { selection } = tr;

        console.log('[FigureWithImage] Creating node', {
          timestamp: new Date().toISOString(),
          attrs: options
        });

        const node = this.type.create(options);
        if (dispatch) {
          tr.replaceSelectionWith(node);
        }

        return true;
      },
      setFigureSize: size => ({ tr, state }) => {
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from);
        if (!node || node.type.name !== this.name) return false;

        tr.setNodeMarkup(selection.from, null, {
          ...node.attrs,
          'data-size': size
        });
        return true;
      },
      setFigureAlignment: alignment => ({ tr, state }) => {
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from);
        if (!node || node.type.name !== this.name) return false;

        tr.setNodeMarkup(selection.from, null, {
          ...node.attrs,
          'data-alignment': alignment
        });
        return true;
      },
      setFigureWrap: (wrap: 'on' | 'off') => ({ tr, state }) => {
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from);
        if (!node || node.type.name !== this.name) return false;

        tr.setNodeMarkup(selection.from, null, {
          ...node.attrs,
          'data-wrap': wrap
        });
        return true;
      },
      deleteFigure: () => ({ commands }) => {
        return commands.deleteNode(this.name);
      }
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureWithImageView);
  },
});
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FigureWithImageView } from '@/components/common/FigureWithImageView';

export interface FigureWithImageOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureWithImage: {
      /**
       * Add a figure with an image
       */
      setFigureWithImage: (options: { src: string; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

export const FigureWithImage = Node.create<FigureWithImageOptions>({
  name: 'figureWithImage',

  group: 'block',

  content: 'text*',

  draggable: true,

  isolating: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('src'),
      },
      alt: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('alt'),
      },
      'data-size': {
        default: 'medium',
        parseHTML: element => element.getAttribute('data-size') || 'medium',
      },
      'data-alignment': {
        default: 'left',
        parseHTML: element => element.getAttribute('data-alignment') || 'left',
      },
      'data-aspect-ratio': {
        default: '4:3',
        parseHTML: element => element.getAttribute('data-aspect-ratio') || '4:3',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        contentElement: 'figcaption',
      },
      {
        tag: 'img',
        getAttrs: (node) => {
            // if it is already in a figure, we don't want to wrap it again
            if ((node as HTMLElement).parentElement?.tagName === 'FIGURE') {
                return false
            }
            return {}
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { 'data-size': size, 'data-alignment': alignment, 'data-aspect-ratio': aspectRatio } = node.attrs;
    
    const figureAttrs = {
        'data-size': size,
        'data-alignment': alignment,
        'data-aspect-ratio': aspectRatio,
    }

    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, figureAttrs),
      ['img', { src: node.attrs.src, alt: node.attrs.alt, class: 'image' }],
      ['figcaption', 0],
    ];
  },

  addCommands() {
    return {
      setFigureWithImage: options => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureWithImageView);
  },
}); 
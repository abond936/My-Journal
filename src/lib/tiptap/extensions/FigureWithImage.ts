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
        // ADDED width and height to the command options
        width: number;
        height: number;
      }) => ReturnType;
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
      src: { default: null },
      alt: { default: null },
      // ADDED width and height attributes to the node itself
      width: { default: null },
      height: { default: null },
      'data-size': { default: 'medium' },
      'data-alignment': { default: 'left' },
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
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            width: parseInt(img.getAttribute('width') || '0', 10),
            height: parseInt(img.getAttribute('height') || '0', 10),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    // This is just a fallback for non-React environments
    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-figure-with-image': '' }),
      ['img', { src: node.attrs.src, alt: node.attrs.alt, width: node.attrs.width, height: node.attrs.height }],
      ['figcaption', 0],
    ];
  },

  addCommands() {
    return {
      setFigureWithImage: options => ({ commands }) => {
        // Ensure all required attributes are provided
        if (!options.src || !options.width || !options.height) {
          console.error("FigureWithImage requires src, width, and height.");
          return false;
        }
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
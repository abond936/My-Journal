import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Figure } from '../components/Figure';

// Define the options interface for the Figure extension
export interface FigureOptions {
  HTMLAttributes: Record<string, any>;
}

// Extend the TipTap core module to add our custom commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      setFigure: (options: {
        src: string;
        alt?: string;
        caption?: string;
        // NEW: width and height are now required for Next.js Image
        width: number;
        height: number;
        size?: 'small' | 'medium' | 'large';
        alignment?: 'left' | 'center' | 'right';
      }) => ReturnType;
    };
  }
}

// Create the Figure node extension
export const FigureExtension = Node.create<FigureOptions>({
  name: 'figure',
  group: 'block',
  content: 'figcaption', // The 'image' is now part of the node view, not the content
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      // Attributes for the Next.js Image component
      src: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('src'),
      },
      width: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('width'),
      },
      height: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('height'),
      },
      alt: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('alt'),
      },

      // Styling attributes
      size: {
        default: 'medium',
        parseHTML: element => element.getAttribute('data-size'),
      },
      alignment: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-alignment'),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-figure]', // Look for a 'figure' tag with this attribute
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // This is a fallback for environments where React isn't available
    return ['figure', mergeAttributes(HTMLAttributes, { 'data-figure': '' }), 0];
  },

  // THIS IS THE KEY CHANGE: Wire up the React component
  addNodeView() {
    return ReactNodeViewRenderer(Figure);
  },

  addCommands() {
    return {
      setFigure:
        (options) =>
        ({ commands }) => {
          const { src, alt, caption, width, height, size, alignment } = options;
          
          if (!src || !width || !height) {
            console.error('setFigure command requires src, width, and height.');
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              src,
              width,
              height,
              alt,
              size: size || 'medium',
              alignment: alignment || 'left',
            },
            content: [
              {
                type: 'figcaption',
                content: caption ? [{ type: 'text', text: caption }] : [],
              },
            ],
          });
        },
    };
  },
});
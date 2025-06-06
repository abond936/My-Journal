import { Node, mergeAttributes } from '@tiptap/core';

export interface FigureOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      setFigure: (options: {
        src: string;
        alt?: string;
        size?: 'small' | 'medium' | 'large';
        alignment?: 'left' | 'center' | 'right';
        metadata?: any;
      }) => ReturnType;
    };
  }
}

export const Figure = Node.create<FigureOptions>({
  name: 'figure',

  group: 'block',

  content: 'image figcaption',

  defining: true,

  addAttributes() {
    return {
      size: {
        default: 'medium',
        parseHTML: element => element.getAttribute('data-size'),
        renderHTML: attributes => {
          return {
            'data-size': attributes.size,
            class: `image-${attributes.size}`,
          };
        },
      },
      alignment: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-alignment'),
        renderHTML: attributes => {
          return {
            'data-alignment': attributes.alignment,
            class: `image-${attributes.alignment}`,
            style: `
              float: ${attributes.alignment === 'center' ? 'none' : attributes.alignment};
              margin-left: ${attributes.alignment === 'right' ? '1rem' : '0'};
              margin-right: ${attributes.alignment === 'left' ? '1rem' : '0'};
              text-align: ${attributes.alignment === 'center' ? 'center' : 'left'};
            `,
          };
        },
      },
      metadata: {
        default: null,
        parseHTML: element => {
          const metadata = element.getAttribute('data-metadata');
          return metadata ? JSON.parse(metadata) : null;
        },
        renderHTML: attributes => {
          return {
            'data-metadata': attributes.metadata ? JSON.stringify(attributes.metadata) : null,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setFigure:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              size: options.size || 'medium',
              alignment: options.alignment || 'left',
              metadata: options.metadata || null,
            },
            content: [
              {
                type: 'image',
                attrs: {
                  src: options.src,
                  alt: options.alt || '',
                },
              },
              {
                type: 'figcaption',
                content: [
                  {
                    type: 'text',
                    text: options.alt || '',
                  },
                ],
              },
            ],
          });
        },
    };
  },
}); 
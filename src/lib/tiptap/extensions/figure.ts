import { Node, mergeAttributes } from '@tiptap/core';

// Define the options interface for the Figure extension
export interface FigureOptions {
  HTMLAttributes: Record<string, any>;
}

// Extend the TipTap core module to add our custom commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      // Command to create a new figure with an image
      setFigure: (options: {
        src: string;        // Image source URL
        alt?: string;       // Alt text for accessibility
        size?: 'small' | 'medium' | 'large';  // Image size
        alignment?: 'left' | 'center' | 'right';  // Image alignment
        aspectRatio?: string;  // Aspect ratio for the image
        metadata?: any;     // Additional metadata
      }) => ReturnType;
      // Command to wrap an existing image in a figure
      wrapImage: (options: {
        size?: 'small' | 'medium' | 'large';  // Image size
        alignment?: 'left' | 'center' | 'right';  // Image alignment
        aspectRatio?: string;  // Aspect ratio for the image
      }) => ReturnType;
    };
  }
}

// Create the Figure node extension
export const Figure = Node.create<FigureOptions>({
  name: 'figure',  // Name of the node type

  group: 'block',  // Group it belongs to

  content: 'image figcaption',  // Allowed content types

  defining: true,  // This is a defining node

  // Define the attributes that can be set on the figure
  addAttributes() {
    return {
      // Size attribute for controlling image dimensions
      size: {
        default: 'medium',
        parseHTML: element => element.getAttribute('data-size'),
        renderHTML: attributes => ({
          'data-size': attributes.size,
          class: `image-${attributes.size}`,
        }),
      },
      // Alignment attribute for controlling image position
      alignment: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-alignment'),
        renderHTML: attributes => ({
          'data-alignment': attributes.alignment,
          class: `image-${attributes.alignment}`,
          style: `
            float: ${attributes.alignment === 'center' ? 'none' : attributes.alignment};
            margin-left: ${attributes.alignment === 'right' ? '1rem' : '0'};
            margin-right: ${attributes.alignment === 'left' ? '1rem' : '0'};
            text-align: ${attributes.alignment === 'center' ? 'center' : 'left'};
          `,
        }),
      },
      // Aspect ratio attribute for maintaining image proportions
      aspectRatio: {
        default: '4:3',
        parseHTML: element => element.getAttribute('data-aspect-ratio'),
        renderHTML: attributes => ({
          'data-aspect-ratio': attributes.aspectRatio,
        }),
      },
      // Metadata attribute for storing additional information
      metadata: {
        default: null,
        parseHTML: element => {
          const metadata = element.getAttribute('data-metadata');
          return metadata ? JSON.parse(metadata) : null;
        },
        renderHTML: attributes => ({
          'data-metadata': attributes.metadata ? JSON.stringify(attributes.metadata) : null,
        }),
      },
    };
  },

  // Define how to parse HTML into this node
  parseHTML() {
    return [
      {
        tag: 'figure',
      },
    ];
  },

  // Define how to render this node to HTML
  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  // Add custom commands for manipulating figures
  addCommands() {
    return {
      // Command to create a new figure with an image
      setFigure:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              size: options.size || 'medium',
              alignment: options.alignment || 'left',
              aspectRatio: options.aspectRatio || '4:3',
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
      // Command to wrap an existing image in a figure
      wrapImage:
        options =>
        ({ editor, tr, dispatch }) => {
          const { state } = editor;
          const { selection } = state;
          const { $from } = selection;
          
          // Check if the current selection is an image
          const node = state.doc.nodeAt($from.pos);
          console.log('Current node:', node?.type.name);
          
          if (node?.type.name !== 'image') {
            console.log('Not an image node, cannot wrap');
            return false;
          }

          // Create a new figure node with the selected image
          const figure = state.schema.nodes.figure.create(
            {
              size: options.size || 'medium',
              alignment: options.alignment || 'left',
              aspectRatio: options.aspectRatio || '4:3',
            },
            [
              state.schema.nodes.image.create(node.attrs),
              state.schema.nodes.figcaption.create(
                null,
                state.schema.text(node.attrs.alt || '')
              ),
            ]
          );

          // Create a transaction to replace the image with the figure
          const newTr = tr.replaceWith($from.pos, $from.pos + node.nodeSize, figure);
          console.log('Transaction created:', newTr);
          
          if (dispatch) {
            dispatch(newTr);
            console.log('Transaction dispatched');
            return true;
          }
          
          return false;
        },
    };
  },
}); 
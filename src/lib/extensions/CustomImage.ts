import { mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';

export interface ImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: string;
  height?: string;
  size?: 'small' | 'medium' | 'large';
  alignment?: 'left' | 'center' | 'right';
  caption?: string;
  'data-photo-id'?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (attributes: ImageAttributes) => ReturnType;
      updateImage: (attributes: Partial<ImageAttributes>) => ReturnType;
    };
  }
}

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: 'medium',
        parseHTML: element => element.getAttribute('data-size'),
        renderHTML: attributes => {
          return {
            'data-size': attributes.size,
          };
        },
      },
      alignment: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-alignment'),
        renderHTML: attributes => {
          return {
            'data-alignment': attributes.alignment,
          };
        },
      },
      caption: {
        default: '',
        parseHTML: element => element.getAttribute('data-caption'),
        renderHTML: attributes => {
          return {
            'data-caption': attributes.caption,
          };
        },
      },
      'data-photo-id': {
        default: null,
        parseHTML: element => element.getAttribute('data-photo-id'),
        renderHTML: attributes => {
          return {
            'data-photo-id': attributes['data-photo-id'],
          };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      updateImage: attributes => ({ commands }) => {
        return commands.updateAttributes('image', attributes);
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      {
        class: `image-${HTMLAttributes['data-size'] || 'medium'} image-${HTMLAttributes['data-alignment'] || 'center'}`,
      },
      [
        'img',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          class: 'clickable-image',
        }),
      ],
      HTMLAttributes['data-caption'] ? [
        'figcaption',
        {},
        HTMLAttributes['data-caption'],
      ] : null,
    ].filter(Boolean);
  },
}); 
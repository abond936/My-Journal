import React from 'react';
import Image from 'next/image';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Node as ProsemirrorNode } from 'prosemirror-model';

interface FigureProps {
  node: ProsemirrorNode;
  updateAttributes: (attrs: Record<string, any>) => void;
  selected: boolean;
}

export const Figure: React.FC<FigureProps> = ({ node, updateAttributes, selected }) => {
  const { src, alt, width, height, alignment, size } = node.attrs;

  const getAlignmentClass = () => {
    switch (alignment) {
      case 'center':
        return 'mx-auto';
      case 'right':
        return 'float-right ml-4';
      case 'left':
        return 'float-left mr-4';
      default:
        return 'float-left mr-4';
    }
  };

  const getSizeStyles = () => {
    // These sizes can be refined with more specific CSS classes if needed
    switch (size) {
      case 'small':
        return { maxWidth: '200px' };
      case 'large':
        return { maxWidth: '600px' };
      case 'medium':
      default:
        return { maxWidth: '400px' };
    }
  };

  return (
    <NodeViewWrapper as="figure" className={`flex flex-col ${getAlignmentClass()}`} style={getSizeStyles()}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`rounded-lg ${selected ? 'ring-2 ring-blue-500' : ''}`}
      />
      <NodeViewContent as="figcaption" className="text-center text-sm text-gray-500 italic" />
    </NodeViewWrapper>
  );
}; 
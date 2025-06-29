import { HydratedCard, CardUpdate, GalleryMediaItem } from '@/lib/types/card';
import { Node } from 'prosemirror-model';
import { Editor } from '@tiptap/react';

export function extractMediaFromContent(content: any): string[] {
  const mediaIds: string[] = [];

  if (!content || !content.content) {
    return mediaIds;
  }

  function traverse(nodes: any[]) {
    nodes.forEach(node => {
      if (node.type === 'figure' && node.attrs.mediaId) {
        mediaIds.push(node.attrs.mediaId);
      }
      if (node.content) {
        traverse(node.content);
      }
    });
  }

  traverse(content.content);
  return mediaIds;
}

export function transformToCardUpdate(hydratedCard: HydratedCard): CardUpdate {
  const skinnyGalleryMedia = hydratedCard.galleryMedia.map(item => ({
    mediaId: item.mediaId,
    caption: item.caption,
    objectPosition: item.objectPosition,
  }));

  const contentMedia = extractMediaFromContent(hydratedCard.content);

  return {
    title: hydratedCard.title,
    status: hydratedCard.status,
    content: hydratedCard.content,
    tags: hydratedCard.tags,
    childCardIds: hydratedCard.childCardIds,
    coverImageId: hydratedCard.coverImageId,
    coverImageObjectPosition: hydratedCard.coverImageObjectPosition,
    galleryMedia: skinnyGalleryMedia,
    contentMedia,
  };
} 
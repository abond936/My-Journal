import { PhotoMetadata } from '@/lib/services/photos/photoService';

export class ContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentValidationError';
  }
}

export const validateContent = (content: string): boolean => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  // Validate all images have required metadata
  const images = tempDiv.querySelectorAll('figure img');
  for (const img of images) {
    if (!img.getAttribute('src')) {
      throw new ContentValidationError('Image missing required src attribute');
    }
  }
  
  return true;
};

export const validateMediaReferences = (content: string, media: PhotoMetadata[]): boolean => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  const imageSrcs = new Set(
    Array.from(tempDiv.querySelectorAll('figure img'))
      .map(img => img.getAttribute('src'))
  );
  
  const mediaUrls = new Set(media.map(m => m.previewUrl));
  
  // Ensure all images in content have corresponding media entries
  for (const src of imageSrcs) {
    if (src && !mediaUrls.has(src)) {
      // Note: This validation might be complex if URLs can have different formats.
      // For now, we do a direct match.
      console.warn(`Image with src ${src} may be missing from media array`);
    }
  }
  
  return true;
};

export const extractPhotoMetadata = (content: string): PhotoMetadata[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  const figures = tempDiv.querySelectorAll('figure');
  return Array.from(figures).map(figure => {
    const img = figure.querySelector('img');
    const caption = figure.querySelector('figcaption');

    // This is a simplified extraction. We might not have all metadata.
    // We construct a partial PhotoMetadata object based on what's in the HTML.
    return {
      id: img?.src || '', // Use src as a unique identifier for now
      previewUrl: img?.src || '',
      filename: img?.alt || 'image',
      caption: caption?.textContent || '',
    } as Partial<PhotoMetadata> as PhotoMetadata;
  });
}; 
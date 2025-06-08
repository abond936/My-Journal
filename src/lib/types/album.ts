// One of two primary content unit 

export interface PhotoMetadata {
  id: string;
  filename: string;
  path: string;
  albumId: string;
  albumName: string;
  tags: string[];
  size: number;
  lastModified: Date;
  thumbnailUrl: string;
  previewUrl: string;
  webUrl: string;
  caption?: string;
}

export interface Album {
  id: string;
  title: string;
  caption: string;
  description: string;
  coverImage?: string;
  tags: string[];
  mediaCount: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published';
  images: AlbumImage[];

  // image collection? 
  // album reference?
}

// This interface is used for the data coming from the OneDrive API
export interface SourceAlbum {
  id: string;
  name: string;
  description: string;
  path: string;
  photoCount: number;
  photos: PhotoMetadata[];
  tags: string[];
  isEnabled: boolean;
}

export interface AlbumImage {
  url: string;
  caption?: string;
}

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  children: TreeNode[];
} 
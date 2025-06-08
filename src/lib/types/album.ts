// One of two primary content unit 

export interface PhotoMetadata {
  id: string;
  filename: string;
  path: string;
  albumId: string;
  albumName: string;
  tags: string[];
  size: number;
  width: number;
  height: number;
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
  // The mediaCount will now be derived from the length of the images array.
  mediaCount: number; 
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published';
  // The 'images' field will now hold our new, richer AlbumImage objects.
  images: AlbumImage[]; 
}


// This interface is used for the data coming from the OneDrive API
export interface SourceCollection {
  id: string;
  name: string;
  description: string;
  path: string;
  photoCount: number;
  photos: PhotoMetadata[];
  tags: string[];
  isEnabled: boolean;
  sourceProvider: 'onedrive' | 'google-photos' | 'local-drive' | 'file-system';
}

// Replace the old AlbumImage interface with this new, robust model.
export interface AlbumImage {
  // --- CORE IDENTIFIERS (Required for all sources) ---
  /** The permanent, unique ID (or path for local files) of the photo in its native service. */
  sourceId: string;
  /** The service this photo belongs to. */
  sourceType: 'local' | 'onedrive' | 'google_photos' | 'apple_photos';

  // --- CORE METADATA (Common across all sources) ---
  /** The original filename of the photo. */
  filename: string;
  /** The natural width of the photo in pixels. */
  width: number;
  /** The natural height of the photo in pixels. */
  height: number;
  /** The original creation date of the photo. */
  createdAt: Date;

  // --- USER-EDITABLE DATA (In our application) ---
  /** The caption a user writes for this photo *in our app*. */
  caption?: string;

  // --- SOURCE-SPECIFIC DATA (For flexibility) ---
  /** An optional field to hold any unique data or identifiers specific to the source service. */
  sourceMetadata?: {
    /** For Google Photos, we might store the base URL to allow for dynamic resizing. */
    googlePhotosBaseUrl?: string;
    /** For OneDrive, we might store the direct download URL if it's different from the display URL. */
    oneDriveDownloadUrl?: string;
  };

  // --- CACHED URLS (For immediate display) ---
  /** The primary URL used for rendering the image in our app. This may be temporary. */
  displayUrl: string;
  /** The URL for the low-resolution thumbnail. This may also be temporary. */
  thumbnailUrl: string;
}


export interface TreeNode {
  id: string;
  name: string;
  path: string;
  children: TreeNode[];
} 
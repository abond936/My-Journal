/**
 * Album Configuration
 * 
 * Defines which folders should be treated as albums and how they should be mapped.
 */

export interface AlbumMapping {
  folderPath: string;      // Relative path from root
  albumName: string;       // Display name for the album
  description?: string;    // Optional album description
  tags?: string[];        // Initial tags for the album
  isEnabled: boolean;     // Whether this album is currently active
}

// Example configuration - you would modify this with your actual folders
export const albumMappings: AlbumMapping[] = [
  {
    folderPath: "124 Keller",
    albumName: "124 Keller House",
    description: "Photos of the house at 124 Keller",
    tags: ["house", "property"],
    isEnabled: true
  },
  // Add more mappings as needed
];

/**
 * Checks if a folder should be treated as an album
 */
export function isAlbumFolder(folderPath: string): boolean {
  return albumMappings.some(mapping => 
    mapping.isEnabled && 
    folderPath.endsWith(mapping.folderPath)
  );
}

/**
 * Gets the album configuration for a folder
 */
export function getAlbumConfig(folderPath: string): AlbumMapping | undefined {
  return albumMappings.find(mapping => 
    mapping.isEnabled && 
    folderPath.endsWith(mapping.folderPath)
  );
}

/**
 * Updates the album configuration
 */
export function updateAlbumConfig(newMappings: AlbumMapping[]): void {
  // TODO: Implement persistence
  albumMappings.length = 0;
  albumMappings.push(...newMappings);
} 
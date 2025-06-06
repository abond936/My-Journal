import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Album, PhotoMetadata } from '@/lib/services/photos/photoService';

interface AlbumGridProps {
  album: Album;
  linkedEntryId?: string;
  onPhotoClick?: (photo: PhotoMetadata) => void;
}

export const AlbumGrid: React.FC<AlbumGridProps> = ({
  album,
  linkedEntryId,
  onPhotoClick
}) => {
  return (
    <div className="space-y-4">
      {/* Album Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">{album.name}</h2>
          <p className="text-gray-600">{album.description}</p>
        </div>
        {linkedEntryId && (
          <Link
            href={`/entries/${linkedEntryId}`}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <span>View Entry</span>
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        )}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {album.photos.map(photo => (
          <div
            key={photo.id}
            className="relative aspect-square group cursor-pointer"
            onClick={() => onPhotoClick?.(photo)}
          >
            <Image
              src={`file://${photo.path}`}
              alt={photo.filename}
              fill
              className="object-cover rounded-lg transition-transform group-hover:scale-105"
            />
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.caption}
              </div>
            )}
            {photo.tags.length > 0 && (
              <div className="absolute top-2 right-2 flex flex-wrap gap-1">
                {photo.tags.map(tag => (
                  <span
                    key={tag}
                    className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 
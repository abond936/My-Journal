import React, { useState } from 'react';
import Image from 'next/image';
import { PhotoMetadata } from '@/lib/services/photos/photoService';
import { PhotoPicker } from './PhotoPicker';

interface EntryCoverPhotoProps {
  coverPhoto?: PhotoMetadata;
  onCoverPhotoSelect: (photo: PhotoMetadata) => void;
}

export const EntryCoverPhoto: React.FC<EntryCoverPhotoProps> = ({
  coverPhoto,
  onCoverPhotoSelect
}) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative w-full h-48 mb-4">
      {coverPhoto ? (
        <div className="relative w-full h-full">
          <Image
            src={`file://${coverPhoto.path}`}
            alt={coverPhoto.caption || 'Cover photo'}
            fill
            className="object-cover rounded-lg"
          />
          <button
            onClick={() => setShowPicker(true)}
            className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded hover:bg-opacity-70"
          >
            Change Cover
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600"
        >
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Add Cover Photo</span>
          </div>
        </button>
      )}

      {showPicker && (
        <PhotoPicker
          mode="cover"
          onSelect={photo => {
            onCoverPhotoSelect(photo);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}; 
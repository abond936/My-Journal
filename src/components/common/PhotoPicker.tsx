import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Media } from '@/lib/types/photo';
import styles from './PhotoPicker.module.css';

interface PhotoPickerProps {
  onSelect: (media: Media | null) => void;
  buttonText?: string;
  className?: string;
  disabled?: boolean;
}

export default function PhotoPicker({
  onSelect,
  buttonText = 'Select Photo',
  className = '',
  disabled = false
}: PhotoPickerProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    try {
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const media: Media = await response.json();
      onSelect(media);
    } catch (error) {
      console.error('Error uploading image:', error);
      // You might want to show an error message to the user here
    }
  }, [onSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`${styles.container} ${isDragActive ? styles.dragActive : ''} ${className}`}
    >
      <input {...getInputProps()} />
      <button
        type="button"
        className={styles.button}
        disabled={disabled}
      >
        {isDragActive ? 'Drop the image here' : buttonText}
      </button>
    </div>
  );
} 
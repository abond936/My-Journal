'use client';

import React, { useState, useRef } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import styles from '@/styles/components/common/editor/ImageUploadDialog.module.css';

interface ImageUploadDialogProps {
  onUploadComplete: (url: string) => void;
  onCancel: () => void;
}

export default function ImageUploadDialog({ onUploadComplete, onCancel }: ImageUploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const storage = getStorage();
      const timestamp = Date.now();
      const imageRef = ref(storage, `images/${timestamp}_${file.name}`);

      const uploadTask = uploadBytesResumable(imageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress);
        },
        (error) => {
          setError('Failed to upload image. Please try again.');
          console.error('Upload error:', error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onUploadComplete(downloadURL);
        }
      );
    } catch (err) {
      setError('Failed to upload image. Please try again.');
      console.error('Upload error:', err);
    }
  };

  return (
    <div className={styles.dialog}>
      <div className={styles.content}>
        <h3>Upload Image</h3>
        
        {error && <div className={styles.error}>{error}</div>}
        
        {isUploading ? (
          <div className={styles.progress}>
            <div 
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
            <span>{Math.round(progress)}%</span>
          </div>
        ) : (
          <div className={styles.uploadArea}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className={styles.fileInput}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.uploadButton}
            >
              Choose Image
            </button>
            <p className={styles.uploadHint}>
              Supported formats: JPG, PNG, GIF
              <br />
              Max size: 5MB
            </p>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={isUploading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 
import { useState, useCallback } from 'react';
import { Media } from '@/lib/types/photo';

/**
 * Represents the state of a single file being uploaded.
 */
export interface UploadingFileState {
  id: string; // A temporary unique ID for the file in the list, e.g., timestamp-filename
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string; // Error message if the upload fails
  media?: Media; // The canonical Media object returned from the server on success
}

/**
 * Configuration options for the useImageImport hook.
 */
interface UseImageImportOptions {
  /**
   * Callback executed for each successfully uploaded image.
   * @param media The new Media object from the server.
   */
  onSuccess?: (media: Media) => void;
  /**
   * Callback executed for each file that fails to upload.
   * @param error The error that occurred.
   * @param file The file that failed.
   */
  onError?: (error: Error, file: File) => void;
  /**
   * Callback executed after all selected files have been processed (either success or error).
   */
  onSettled?: () => void;
}

/**
 * A hook to manage the complex process of uploading images and creating Media assets.
 * It encapsulates state management for individual file statuses, API calls, and error handling.
 * 
 * @param options Callbacks for handling success, error, and completion events.
 * @returns An object with the `importImages` function to trigger the upload, and state variables 
 *          to monitor the process (`uploadingFiles`, `isImporting`).
 */
export function useImageImport({ onSuccess, onError, onSettled }: UseImageImportOptions = {}) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFileState[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const importImages = useCallback(async (files: File[]) => {
    setIsImporting(true);
    
    const initialFileStates: UploadingFileState[] = files.map((file) => ({
      id: `${Date.now()}-${file.name}`,
      file,
      status: 'pending',
    }));
    setUploadingFiles(initialFileStates);

    const uploadPromises = initialFileStates.map(async (fileState) => {
      setUploadingFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: 'uploading' } : f));

      try {
        const formData = new FormData();
        formData.append('file', fileState.file);

        const response = await fetch('/api/images/browser', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to upload image.');
        }
        
        const newMedia = result as Media;

        setUploadingFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: 'success', media: newMedia } : f));
        
        onSuccess?.(newMedia);
        return { success: true, media: newMedia };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An unknown error occurred');
        setUploadingFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: 'error', error: error.message } : f));
        onError?.(error, fileState.file);
        return { success: false, error };
      }
    });

    await Promise.allSettled(uploadPromises);

    setIsImporting(false);
    onSettled?.();
  }, [onSuccess, onError, onSettled]);

  return {
    importImages,
    uploadingFiles,
    isImporting,
  };
} 
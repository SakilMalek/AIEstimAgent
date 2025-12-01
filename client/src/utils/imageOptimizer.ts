/**
 * Image optimization utilities for faster uploads and processing
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

/**
 * Compress and optimize an image file before upload
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.85,
    maxSizeMB = 5,
  } = options;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    console.warn('[ImageOptimizer] Not an image file, returning as-is:', file.type);
    return file;
  }

  // If file is already small enough, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    console.log('[ImageOptimizer] File already small enough, skipping compression');
    return file;
  }

  console.log('[ImageOptimizer] Starting compression:', {
    originalSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    maxWidth,
    maxHeight,
    quality
  });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Use medium quality smoothing for speed (not high)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with error handling - use lower quality for speed
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.error('[ImageOptimizer] Failed to create blob');
              // Fallback to original file if compression fails
              resolve(file);
              return;
            }
            
            // Validate blob size
            if (blob.size === 0) {
              console.error('[ImageOptimizer] Blob is empty, using original file');
              resolve(file);
              return;
            }
            
            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            console.log('[ImageOptimizer] Compression successful:', {
              originalSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
              compressedSize: `${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`,
              reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
            });
            
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = (error) => {
        console.error('[ImageOptimizer] Failed to load image:', error);
        // Fallback to original file if image loading fails
        resolve(file);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = (error) => {
      console.error('[ImageOptimizer] Failed to read file:', error);
      // Fallback to original file if reading fails
      resolve(file);
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions without loading the full image
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

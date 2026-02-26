import { supabase } from './supabase';

const BUCKET_NAME = 'order-images';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload an image to Supabase Storage
 * @param file The image file to upload
 * @param orderId The order ID to associate with the image
 * @returns Upload result with public URL or error
 */
export async function uploadOrderImage(
  file: File,
  orderId: string
): Promise<UploadResult> {
  try {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
      };
    }

    // Validate file size (12MB max)
    const maxSize = 12 * 1024 * 1024; // 12MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 12MB limit.',
      };
    }

    // Generate unique filename with timestamp
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${orderId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: `Upload failed: ${error.message}`,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during upload.',
    };
  }
}

/**
 * Delete an image from Supabase Storage
 * @param imageUrl The full public URL of the image to delete
 * @returns Success status
 */
export async function deleteOrderImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected delete error:', error);
    return false;
  }
}

/**
 * Replace an existing order image with a new one
 * @param file The new image file
 * @param orderId The order ID
 * @param oldImageUrl The URL of the existing image to replace (optional)
 * @returns Upload result with new public URL or error
 */
export async function replaceOrderImage(
  file: File,
  orderId: string,
  oldImageUrl?: string
): Promise<UploadResult> {
  // Delete old image if it exists
  if (oldImageUrl) {
    await deleteOrderImage(oldImageUrl);
  }

  // Upload new image
  return uploadOrderImage(file, orderId);
}

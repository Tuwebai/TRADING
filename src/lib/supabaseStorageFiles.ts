/**
 * Supabase Storage for files (screenshots, videos)
 */

import { supabase, isSupabaseConfigured } from './supabase';

const BUCKET_NAME = 'trade-media';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  path: string,
  userId: string
): Promise<{ url: string | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { url: null, error: new Error('Supabase not configured') };
  }
  
  try {
    // Upload file to user's folder: {userId}/{path}
    const filePath = `${userId}/${path}`;
    
    const { error } = await supabase!
      .storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      return { url: null, error };
    }
    
    // Get public URL
    const { data: urlData } = supabase!
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return {
      url: urlData.publicUrl,
      error: null,
    };
  } catch (error) {
    return {
      url: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  path: string,
  userId: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }
  
  try {
    const filePath = `${userId}/${path}`;
    
    const { error } = await supabase!
      .storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    return { error };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Get public URL for a file
 */
export function getFileUrl(path: string, userId: string): string | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  const filePath = `${userId}/${path}`;
  const { data } = supabase!
    .storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}


import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration environment variables.");
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to a Supabase storage bucket and returns its public URL.
 * 
 * @param bucketName Name of the storage bucket
 * @param path File path inside the bucket (e.g. "avatars/std-1.jpg")
 * @param fileBody Buffer, Blob, or File data
 * @param contentType MIME type of the file
 */
export async function uploadFile(
  bucketName: string,
  path: string,
  fileBody: Buffer | Blob | File,
  contentType: string
): Promise<string> {
  const { data, error } = await supabaseClient.storage
    .from(bucketName)
    .upload(path, fileBody, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`Failed to upload file to bucket "${bucketName}" at path "${path}":`, error);
    throw error;
  }

  // Retrieve the public URL
  const { data: urlData } = supabaseClient.storage
    .from(bucketName)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * Deletes a file from a Supabase storage bucket.
 * 
 * @param bucketName Name of the storage bucket
 * @param path File path inside the bucket
 */
export async function deleteFile(bucketName: string, path: string): Promise<void> {
  const { error } = await supabaseClient.storage
    .from(bucketName)
    .remove([path]);

  if (error) {
    console.error(`Failed to delete file from bucket "${bucketName}" at path "${path}":`, error);
    throw error;
  }
}

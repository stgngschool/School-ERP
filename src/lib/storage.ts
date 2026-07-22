import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration environment variables.");
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to a Supabase storage bucket, falling back to local public storage if the bucket doesn't exist.
 * 
 * @param bucketName Name of the storage bucket
 * @param pathInsideBucket File path inside the bucket (e.g. "photos/std-1.jpg")
 * @param fileBody Buffer, Blob, or File data
 * @param contentType MIME type of the file
 */
export async function uploadFile(
  bucketName: string,
  pathInsideBucket: string,
  fileBody: Buffer | Blob | File,
  contentType: string
): Promise<string> {
  try {
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .upload(pathInsideBucket, fileBody, {
        contentType,
        upsert: true,
      });

    if (!error) {
      const { data: urlData } = supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(pathInsideBucket);

      if (urlData?.publicUrl) {
        return urlData.publicUrl;
      }
    } else {
      console.warn(`Supabase storage bucket error ("${bucketName}"):`, error.message);
    }
  } catch (err: any) {
    console.warn(`Supabase storage failed for bucket "${bucketName}", using local file storage fallback.`, err?.message || err);
  }

  // Fallback: Save to local public/uploads/${bucketName}/${pathInsideBucket}
  try {
    const buffer = Buffer.isBuffer(fileBody)
      ? fileBody
      : Buffer.from(await (fileBody as Blob).arrayBuffer());

    const sanitizedPath = pathInsideBucket.replace(/\\/g, "/");
    const dirName = path.dirname(sanitizedPath);
    const fileName = path.basename(sanitizedPath);

    const localDir = path.join(process.cwd(), "public", "uploads", bucketName, dirName);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const localFilePath = path.join(localDir, fileName);
    fs.writeFileSync(localFilePath, buffer);

    const relativePublicUrl = `/uploads/${bucketName}/${dirName}/${fileName}`.replace(/\/+/g, "/");
    console.log(`Saved file to local storage fallback: ${relativePublicUrl}`);
    return relativePublicUrl;
  } catch (localErr: any) {
    console.error("Local storage fallback error:", localErr);
    throw new Error("Failed to save file locally or to Supabase storage.");
  }
}

/**
 * Deletes a file from a Supabase storage bucket or local storage fallback.
 */
export async function deleteFile(bucketName: string, pathInsideBucket: string): Promise<void> {
  try {
    await supabaseClient.storage.from(bucketName).remove([pathInsideBucket]);
  } catch (err) {
    // Ignore
  }

  try {
    const sanitizedPath = pathInsideBucket.replace(/\\/g, "/");
    const localFilePath = path.join(process.cwd(), "public", "uploads", bucketName, sanitizedPath);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  } catch (err) {
    // Ignore
  }
}

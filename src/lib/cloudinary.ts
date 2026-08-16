/**
 * Cloudinary Helper Utility
 * Handles direct client-side unsigned uploads and auto-optimization transformations.
 */

export const CLOUDINARY_CONFIG = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "ec4srd3k",
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "School_Website",
};

/**
 * Transforms any Cloudinary image URL into an auto-optimized, responsive WebP/AVIF asset.
 * @param url Original Cloudinary URL
 * @param width Optional maximum width in pixels (e.g. 1200, 800, 400)
 * @param height Optional maximum height in pixels
 * @param crop Crop mode (e.g. 'fill', 'scale', 'limit')
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number,
  crop: "fill" | "scale" | "limit" = "limit"
): string {
  if (!url) return "";

  // If it's a local static asset or non-cloudinary URL, return as is
  if (!url.includes("res.cloudinary.com")) {
    return url;
  }

  // Build transformation string (f_auto: automatic WebP/AVIF format, q_auto: smart AI compression)
  const transforms = ["f_auto", "q_auto"];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width && height) transforms.push(`c_${crop}`);

  const transformStr = transforms.join(",");

  // Insert transformations after '/upload/' in Cloudinary URL
  return url.replace("/upload/", `/upload/${transformStr}/`);
}

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  error?: string;
}

/**
 * Uploads a file directly to Cloudinary using the Unsigned Upload Preset.
 * @param file File object from file input or drag-and-drop
 * @param folder Optional folder name in Cloudinary (e.g. 'school_media', 'gallery', 'facilities')
 */
export async function uploadToCloudinary(
  file: File,
  folder: string = "school_media"
): Promise<UploadResult> {
  try {
    const cloudName = CLOUDINARY_CONFIG.cloudName;
    const uploadPreset = CLOUDINARY_CONFIG.uploadPreset;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary Cloud Name or Upload Preset is not configured.");
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
    };
  } catch (err: any) {
    console.error("Cloudinary upload error:", err);
    return {
      success: false,
      error: err.message || "An unexpected error occurred during upload.",
    };
  }
}

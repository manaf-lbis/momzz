import { createHash } from 'crypto';
import { ENV } from '../config/env';

/**
 * Constructs a full Cloudinary HTTPS URL from a publicId.
 * If the input is already a full http(s) URL or data URI, returns it as-is (backward compatibility).
 */
export const getCloudinaryUrl = (publicIdOrUrl?: string): string => {
  if (!publicIdOrUrl) return '';
  if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://') || publicIdOrUrl.startsWith('data:')) {
    return publicIdOrUrl;
  }
  const cloudName = ENV.CLOUDINARY_CLOUD_NAME || 'demo';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicIdOrUrl}`;
};

/**
 * Extracts public_id from a Cloudinary URL or returns publicId as-is.
 */
export const extractPublicId = (publicIdOrUrl?: string): string => {
  if (!publicIdOrUrl) return '';
  if (!publicIdOrUrl.startsWith('http://') && !publicIdOrUrl.startsWith('https://')) {
    return publicIdOrUrl;
  }
  try {
    const parts = publicIdOrUrl.split('/upload/');
    if (parts.length > 1) {
      let path = parts[1];
      path = path.replace(/^v\d+\//, '');
      path = path.replace(/\.[^/.]+$/, '');
      return path;
    }
  } catch (e) {
    // Fallback
  }
  return publicIdOrUrl;
};

/**
 * Uploads a base64 image to Cloudinary and returns the public_id and generated URL.
 */
export const uploadToCloudinary = async (
  imageData: string,
  folder: string = 'momzz/general'
): Promise<{ publicId: string; url: string }> => {
  if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary image upload is not configured in server environment.');
  }

  if (!imageData || typeof imageData !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(imageData)) {
    throw new Error('Please provide a valid JPG, PNG, or WebP base64 image string.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${ENV.CLOUDINARY_API_SECRET}`)
    .digest('hex');

  const form = new FormData();
  form.append('file', imageData);
  form.append('api_key', ENV.CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${ENV.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const data = (await response.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } };

  if (!response.ok || !data.public_id) {
    throw new Error(data.error?.message || 'Cloudinary image upload failed.');
  }

  return {
    publicId: data.public_id,
    url: getCloudinaryUrl(data.public_id),
  };
};

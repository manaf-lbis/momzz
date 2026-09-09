import { createHash } from 'crypto';
import { ENV } from '../../config/env';

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

const isValidImageMagicBytes = (base64Payload: string): boolean => {
  try {
    const rawBase64 = base64Payload.split(',')[1] || base64Payload;
    const headerBuffer = Buffer.from(rawBase64.slice(0, 32), 'base64');
    if (headerBuffer.length < 4) return false;

    // JPEG (FF D8 FF)
    if (headerBuffer[0] === 0xFF && headerBuffer[1] === 0xD8 && headerBuffer[2] === 0xFF) return true;

    // PNG (89 50 4E 47)
    if (headerBuffer[0] === 0x89 && headerBuffer[1] === 0x50 && headerBuffer[2] === 0x4E && headerBuffer[3] === 0x47) return true;

    // WebP (RIFF .... WEBP)
    if (headerBuffer.length >= 12 && headerBuffer.toString('ascii', 0, 4) === 'RIFF' && headerBuffer.toString('ascii', 8, 12) === 'WEBP') return true;

    return false;
  } catch {
    return false;
  }
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

  if (!isValidImageMagicBytes(imageData)) {
    throw new Error('Invalid image data: File binary signature does not match a valid image format.');
  }

  // Enforce max 5MB base64 payload size (~6.7MB string length)
  if (imageData.length > 7 * 1024 * 1024) {
    throw new Error('Image size exceeds the maximum limit of 5MB.');
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

/**
 * Deletes a single image from Cloudinary by its publicId or full URL.
 * Silently handles cases where the asset is already deleted or not found.
 */
export const deleteFromCloudinary = async (
  publicIdOrUrl?: string
): Promise<{ result: string }> => {
  if (!publicIdOrUrl) return { result: 'skipped' };

  const publicId = extractPublicId(publicIdOrUrl);
  if (!publicId || publicId.startsWith('http://') || publicId.startsWith('https://') || publicId.startsWith('data:')) {
    return { result: 'skipped' };
  }

  if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
    console.warn('[Cloudinary] Skipping asset deletion: Cloudinary credentials not configured.');
    return { result: 'not_configured' };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${ENV.CLOUDINARY_API_SECRET}`)
      .digest('hex');

    const form = new FormData();
    form.append('public_id', publicId);
    form.append('api_key', ENV.CLOUDINARY_API_KEY);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${ENV.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body: form,
    });

    const data = (await response.json()) as { result?: string; error?: { message?: string } };
    if (!response.ok || (data.result !== 'ok' && data.result !== 'not found')) {
      console.warn(`[Cloudinary] Asset deletion returned: ${data.result || data.error?.message || 'unknown'}`);
    }
    return { result: data.result || 'ok' };
  } catch (err: any) {
    console.error(`[Cloudinary] Failed to delete asset ${publicId}:`, err?.message || err);
    return { result: 'error' };
  }
};

/**
 * Deletes multiple images from Cloudinary concurrently.
 */
export const deleteMultipleFromCloudinary = async (
  identifiers: (string | undefined)[]
): Promise<void> => {
  const uniqueIds = Array.from(new Set(identifiers.filter((id): id is string => Boolean(id && typeof id === 'string'))));
  if (uniqueIds.length === 0) return;

  await Promise.allSettled(uniqueIds.map((id) => deleteFromCloudinary(id)));
};


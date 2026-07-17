import { uploadToCloudinary } from './cloudinaryUpload';

export const maxDuration = 60;

// Accepts a raw File/Blob (preferred — enables chunked uploads past the
// base64 body-size cliff) or a legacy base64 data URI.
export const sendCloudinaryFile = async (
  file: File | Blob | string,
  fileType: string,
  fileName: string
): Promise<string> => {
  // Keep the original extension visible in the public_id (legacy behavior
  // existing consumers rely on for e.g. raw file downloads).
  const fileExtension = fileName.split('.').pop();
  const publicId = fileName.replace(/\.[^/.]+$/, '');
  return uploadToCloudinary(file, {
    public_id: `${publicId}.${fileExtension}`,
  });
};

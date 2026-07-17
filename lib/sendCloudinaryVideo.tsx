import { uploadToCloudinary } from './cloudinaryUpload';

export const maxDuration = 60;

// Accepts a raw File/Blob (preferred — enables chunked uploads past the
// base64 body-size cliff) or a legacy base64 data URI.
export const sendCloudinaryVideo = async (
  video: File | Blob | string
): Promise<string> => uploadToCloudinary(video);

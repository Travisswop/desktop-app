import logger from '../utils/logger';

export const sendCloudinaryAudio = async (
  base64Audio: string
): Promise<string> => {
  try {
    const data = new FormData();

    // Append the base64 image directly
    data.append('file', base64Audio);
    data.append('upload_preset', 'swopapp');
    data.append('cloud_name', 'bayshore');

    const cloudResponse = await fetch(
      'https://api.cloudinary.com/v1_1/bayshore/auto/upload',
      {
        method: 'POST',
        body: data,
      }
    );

    if (!cloudResponse.ok) {
      const errorObj = await cloudResponse.json();
      throw new Error(
        `Cloudinary upload failed: ${errorObj.message}`
      );
    }

    const cloudResData = await cloudResponse.json();
    const cloudPicUrl = cloudResData.secure_url;
    return cloudPicUrl;
  } catch (err) {
    logger.error('Error uploading audio to Cloudinary:', err);
    throw err;
  }
};

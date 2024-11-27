export const maxDuration = 60;

export const sendCloudinaryFile = async (
  base64File: string,
  fileType: string,
  fileName: string
): Promise<string> => {
  try {
    const data = new FormData();
    data.append("file", base64File);
    data.append("upload_preset", "swopapp");

    // Extract the file extension from the file name
    const fileExtension = fileName.split('.').pop();

    // Set the public_id with the file extension
    const publicId = fileName.replace(/\.[^/.]+$/, ""); // Remove existing extension
    data.append("public_id", `${publicId}.${fileExtension}`);

    // Determine resource type based on file type
    const resourceType = fileType.startsWith('image') ? 'image' :
      fileType.startsWith('video') ? 'video' : 'raw';
    data.append("resource_type", resourceType);

    const cloudResponse = await fetch(
      `https://api.cloudinary.com/v1_1/bayshore/${resourceType}/upload`,
      {
        method: "POST",
        body: data,
      }
    );

    if (!cloudResponse.ok) {
      const errorObj = await cloudResponse.json();
      throw new Error(`Cloudinary upload failed: ${errorObj.message}`);
    }

    const cloudResData = await cloudResponse.json();
    return cloudResData.secure_url;
  } catch (err) {
    console.error("Error uploading file to Cloudinary:", err);
    throw err;
  }
};

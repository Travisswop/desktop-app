export const maxDuration = 60;

export const sendCloudinaryFile = async (
  base64File: string,
  fileType: string // Include MIME type of the file
): Promise<string> => {
  try {
    const data = new FormData();

    // Append the base64 file
    data.append("file", base64File);
    data.append("upload_preset", "swopapp");
    data.append("cloud_name", "bayshore");

    // Set resource type based on file type
    const resourceType = fileType.startsWith("image")
      ? "image"
      : fileType.startsWith("video")
      ? "video"
      : "raw";
    data.append("resource_type", resourceType);

    const cloudResponse = await fetch(
      "https://api.cloudinary.com/v1_1/bayshore/auto/upload",
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
    const fileUrl = cloudResData.secure_url;

    return fileUrl;
  } catch (err) {
    console.error("Error uploading file to Cloudinary:", err);
    throw err;
  }
};

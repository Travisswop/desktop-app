export const maxDuration = 60;
export const sendCloudinaryImage = async (
  base64Image: string
): Promise<string> => {
  try {
    const data = new FormData();

    // Append the base64 image directly
    data.append("file", base64Image);
    data.append("upload_preset", "swopapp");
    data.append("cloud_name", "bayshore");

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
    const cloudPicUrl = cloudResData.secure_url;
    // console.log("Cloudinary secure URL:", cloudPicUrl);
    return cloudPicUrl;
  } catch (err) {
    console.error("Error uploading image to Cloudinary:", err);
    throw err;
  }
};

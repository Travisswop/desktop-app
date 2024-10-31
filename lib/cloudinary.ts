export const uploadImageToCloudinary = async (image: string) => {
  const formData = new FormData();
  formData.append('file', image);
  formData.append('upload_preset', 'swopapp');

  const response = await fetch(
    'https://api.cloudinary.com/v1_1/bayshore/auto/upload',
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();
  return data.secure_url; // Return the secure URL of the uploaded image
};

export const sendCloudinaryAudio = async (
  base64Audio: string
): Promise<string> => {
  try {
    const data = new FormData();

    // Append the base64 image directly
    data.append("file", base64Audio);
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
    console.error("Error uploading audio to Cloudinary:", err);
    throw err;
  }
};

// export const SendCloudinaryAudio = async (picPath, dispatch) => {
//     try {
//       const picObj = {
//         uri: picPath,
//         type: 'audio/mpeg',
//         name: 'towhid' + Math.random() * 2,
//         height: 20,
//         width: 20,
//       }; //required for cloudinay

//       const data = new FormData();
//       data.append('file', picObj);
//       data.append('upload_preset', 'swopapp');
//       data.append('cloud_name', 'bayshore');
//       const cloudResponse = await fetchWithAuth(
//         'https://api.cloudinary.com/v1_1/bayshore/auto/upload',
//         {
//           method: 'post',
//           body: data,
//         },
//         dispatch
//       );
//       if (!cloudResponse.ok) {
//         //console.log('cloudresponse not ok');
//         const errorObj = await cloudResponse.json();
//         throw errorObj;
//       } else {
//         const cloudResData = await cloudResponse.json();
//         const cloudPicUrl = cloudResData.secure_url;
//         //console.log('cloud secure url from edit profile',cloudPicUrl);
//         return cloudPicUrl;
//       }
//     } catch (err) {
//       console.log('error from sendCloudImageUrl', err);
//       throw err;
//     }
//   };

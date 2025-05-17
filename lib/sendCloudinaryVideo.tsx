export const maxDuration = 60;
export const sendCloudinaryVideo = async (
  base64Video: string
): Promise<string> => {
  try {
    const data = new FormData();

    // const picObj = {
    //   uri: videoPath,
    //   type: "video/mp4",
    //   name: "towhid" + Math.random() * 2,
    //   height: 20,
    //   width: 20,
    // };

    // Append the base64 image directly
    data.append("file", base64Video);
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

// interface FileObject {
//   uri: string;
//   type: string;
//   name: string;
// }

// interface CloudinaryResponse {
//   secure_url: string;
// }

// export const sendCloudinaryVideo = async (
//   videoPath: string
// ): Promise<string> => {
//   try {
//     // Construct the file object
//     const file: FileObject = {
//       uri: videoPath,
//       type: "video/mp4",
//       name: `video_${Date.now()}.mp4`,
//     };

//     // Create FormData and append necessary fields
//     const data = new FormData();
//     data.append("file", {
//       uri: file.uri,
//       type: file.type,
//       name: file.name,
//     } as any); // TypeScript doesn't natively support file objects in FormData, using any as a workaround
//     data.append("upload_preset", "swopapp");
//     data.append("cloud_name", "bayshore");

//     // Make the request to Cloudinary
//     const cloudResponse = await fetch(
//       "https://api.cloudinary.com/v1_1/bayshore/video/upload",
//       {
//         method: "POST",
//         body: data,
//       }
//     );

//     // Check if the response is ok
//     if (!cloudResponse.ok) {
//       const errorObj = await cloudResponse.json();
//       throw new Error(`Cloudinary Error: ${errorObj.error.message}`);
//     }

//     // Parse and return the response data
//     const cloudResData: CloudinaryResponse = await cloudResponse.json();
//     const cloudVideoUrl = cloudResData.secure_url;
//     return cloudVideoUrl;
//   } catch (err) {
//     console.error("Error from sendCloudinaryVideo:", err);
//     throw err;
//   }
// };

// export const sendCloudinaryVideo = async (videoPath) => {
//   try {
//     const picObj = {
//       uri: videoPath,
//       type: "video/mp4",
//       name: "towhid" + Math.random() * 2,
//       height: 20,
//       width: 20,
//     }; //required for cloudinay

//     const data = new FormData();
//     data.append("file", picObj);
//     data.append("upload_preset", "swopapp");
//     data.append("cloud_name", "bayshore");
//     const cloudResponse = await fetch(
//       "https://api.cloudinary.com/v1_1/bayshore/auto/upload",
//       {
//         method: "post",
//         body: data,
//       }
//     );
//     if (!cloudResponse.ok) {
//       //console.log('cloudresponse not ok');
//       const errorObj = await cloudResponse.json();
//       throw errorObj;
//     } else {
//       const cloudResData = await cloudResponse.json();
//       const cloudVideoUrl = cloudResData.secure_url;
//       //console.log('cloud secure url from edit profile',cloudPicUrl);
//       return cloudVideoUrl;
//     }
//   } catch (err) {
//     console.log("error from sendCloudVideoUrl", err);
//     throw err;
//   }
// };

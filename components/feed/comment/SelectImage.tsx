import { useCommentContentStore } from "@/zustandStore/CommentImgContent";
import React, { useRef } from "react";
import toast from "react-hot-toast";
import { FaRegImage } from "react-icons/fa";

const CommentImagePicker = () => {
  const { postContent, setPostContent } = useCommentContentStore(); //manage comment content
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: any) => {
    // const files = event.target.files;
    // console.log("files", files);

    const file = event?.target?.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // setSelectedImage(null);
        // setGalleryImage(reader.result as any);
        setPostContent([
          {
            type: "image",
            src: reader.result as any,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }

    // if (files && files.length > 0) {
    //   //   if (files.length > 4) {
    //   //     setFileError("You can select a maximum of 4 files.");
    //   //     return;
    //   //   }

    //   //   const selectedFiles: { type: "image" | "video"; src: string }[] = [];

    //   Array.from(files).forEach((file) => {
    //     if (file.size > 10 * 1024 * 1024) {
    //       //   setFileError("Each file size must be less than 10 MB");
    //     } else {
    //       const reader = new FileReader();
    //       reader.onloadend = () => {
    //         console.log("file", file);

    //         // if (validImageTypes.includes(file.type)) {
    //         //   selectedFiles.push({
    //         //     type: "image",
    //         //     src: reader.result as string,
    //         //   });
    //         // } else if (validVideoTypes.includes(file.type)) {
    //         //   selectedFiles.push({
    //         //     type: "video",
    //         //     src: reader.result as string,
    //         //   });
    //         // } else {
    //         //   toast.error("Unsupported file format.");
    //         // }

    //         // previous one
    //         const fileType = file.type.startsWith("image/")
    //           ? "image"
    //           : file.type.startsWith("video/")
    //           ? "video"
    //           : null;

    //         if (fileType) {
    //           selectedFiles.push({
    //             type: fileType,
    //             src: reader.result as string,
    //           });
    //           setFileError("");
    //         } else {
    //           setFileError("Only images and videos are allowed");
    //         }

    //         // // After all files are processed, update the state
    //         // if (selectedFiles.length === files.length) {
    //         //   setMediaFiles((prevMediaFiles) => [
    //         //     ...prevMediaFiles,
    //         //     ...selectedFiles,
    //         //   ]);
    //         // }
    //         // Reset the file input value to allow re-selecting the same file
    //         if (fileInputRef.current) {
    //           fileInputRef.current.value = "";
    //         }
    //       };
    //       reader.readAsDataURL(file);
    //     }
    //   });
    //   // Reset the file input value to allow selecting the same file again
    // }
    // event.target.value = "";
  };

  return (
    <div className="relative flex items-center">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={postContent.length === 0 ? handleButtonClick : () => {}}
        type="button"
        className={`${postContent.length > 0 && "cursor-not-allowed disabled"}`}
      >
        <FaRegImage
          size={22}
          className={`${
            postContent.length > 0 ? "text-gray-400" : "text-gray-700"
          }`}
        />
      </button>
    </div>
  );
};

export default CommentImagePicker;

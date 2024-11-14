import React, { useRef } from "react";
import { FaRegImage } from "react-icons/fa";

interface ImageContentProps {
  setFileError: (error: string) => void;
  setMediaFiles: React.Dispatch<
    React.SetStateAction<{ type: "image" | "video" | "gif"; src: string }[]>
  >;
  mediaFilesLength: any;
}

const ImageContent = ({
  setFileError,
  setMediaFiles,
  mediaFilesLength,
}: ImageContentProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      if (files.length > 4) {
        setFileError("You can select a maximum of 4 files.");
        return;
      }

      const selectedFiles: { type: "image" | "video"; src: string }[] = [];

      Array.from(files).forEach((file) => {
        if (file.size > 10 * 1024 * 1024) {
          setFileError("Each file size must be less than 10 MB");
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            const fileType = file.type.startsWith("image/")
              ? "image"
              : file.type.startsWith("video/")
              ? "video"
              : null;

            if (fileType) {
              selectedFiles.push({
                type: fileType,
                src: reader.result as string,
              });
              setFileError("");
            } else {
              setFileError("Only images and videos are allowed");
            }

            // After all files are processed, update the state
            if (selectedFiles.length === files.length) {
              setMediaFiles((prevMediaFiles) => [
                ...prevMediaFiles,
                ...selectedFiles,
              ]);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  return (
    <div className="relative flex items-center">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        multiple
        accept="image/*,video/*" // Optional: restrict to image and video formats only
      />
      <button
        onClick={mediaFilesLength !== 4 ? handleButtonClick : () => {}}
        type="button"
        className={`${mediaFilesLength > 3 && "cursor-not-allowed disabled"}`}
      >
        <FaRegImage
          size={22}
          className={`${
            mediaFilesLength > 3 ? "text-gray-400" : "text-gray-700"
          }`}
        />
      </button>
    </div>
  );
};

export default ImageContent;

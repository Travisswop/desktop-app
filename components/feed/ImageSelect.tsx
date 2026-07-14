import React, { useRef } from "react";
import toast from "react-hot-toast";
import { filterVideoFilesByPlan } from "@/lib/videoLimits";
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

  const validImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const validVideoTypes = ["video/mp4", "video/webm"];

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files;
    if (!picked || picked.length === 0) return;

    if (picked.length > 4) {
      setFileError("You can select a maximum of 4 files.");
      return;
    }

    // Plan-based video length cap (2 min free / 30 min premium).
    const files = await filterVideoFilesByPlan(Array.from(picked));
    if (files.length === 0) return;

    const selectedFiles: { type: "image" | "video"; src: string }[] = [];
    let completedReads = 0; // track how many readers have finished
    const totalFiles = files.length;

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setFileError("Each file size must be less than 10 MB");
        completedReads++;
        if (completedReads === totalFiles && selectedFiles.length > 0) {
          setMediaFiles((prev) => [...prev, ...selectedFiles]);
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (validImageTypes.includes(file.type)) {
          selectedFiles.push({ type: "image", src: reader.result as string });
        } else if (validVideoTypes.includes(file.type)) {
          selectedFiles.push({ type: "video", src: reader.result as string });
        } else {
          toast.error(`Unsupported file format: ${file.name}`);
        }

        completedReads++;

        // Only update state once ALL readers have finished
        if (completedReads === totalFiles && selectedFiles.length > 0) {
          setMediaFiles((prev) => [...prev, ...selectedFiles]);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
      reader.readAsDataURL(file);
    });
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

import { useCommentContentStore } from "@/zustandStore/CommentImgContent";
import React, { useRef } from "react";
import { FaRegImage } from "react-icons/fa";
import toast from "react-hot-toast";

const CommentImagePicker = () => {
  const { postContent, addContent } = useCommentContentStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = () => {
    if (postContent.length >= 4) {
      toast.error("Maximum 4 media items allowed.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (postContent.length >= 4) {
      toast.error("Maximum 4 media items allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      addContent({ type: "image", src: reader.result as string });
    };
    reader.readAsDataURL(file);

    // Reset so same file can be re-selected
    event.target.value = "";
  };

  const isDisabled = postContent.length >= 4;

  return (
    <div className="relative flex items-center">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={handleButtonClick}
        type="button"
        disabled={isDisabled}
        className={isDisabled ? "cursor-not-allowed opacity-40" : ""}
      >
        <FaRegImage
          size={22}
          className={isDisabled ? "text-gray-400" : "text-gray-700"}
        />
      </button>
    </div>
  );
};

export default CommentImagePicker;

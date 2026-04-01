import React, { useEffect, useRef, useState } from "react";
import GifPicker from "gif-picker-react";
import { HiOutlineGif } from "react-icons/hi2";
import { useCommentContentStore } from "@/zustandStore/CommentImgContent";
import toast from "react-hot-toast";

const CommentGifPickerContent = () => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { postContent, addContent } = useCommentContentStore();

  const isDisabled = postContent.length >= 4;

  const toggleGif = () => {
    if (isDisabled) {
      toast.error("Maximum 4 media items allowed.");
      return;
    }
    setShowPicker((prev) => !prev);
  };

  const handleGifClick = (gifData: any) => {
    if (postContent.length >= 4) {
      toast.error("Maximum 4 media items allowed.");
      setShowPicker(false);
      return;
    }
    addContent({ type: "gif", src: gifData.url });
    setShowPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleGif}
        disabled={isDisabled}
        className={isDisabled ? "cursor-not-allowed opacity-40" : ""}
      >
        <HiOutlineGif
          size={23}
          className={isDisabled ? "text-gray-400" : "text-gray-700"}
        />
      </button>

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute top-full mt-2 left-0 z-[9999]" // ← opens upward
        >
          <GifPicker
            onGifClick={handleGifClick}
            tenorApiKey={"AIzaSyA-Xn0TwTUBNXY4EBbDCmnAs7o1XYIoZgU"}
          />
        </div>
      )}
    </div>
  );
};

export default CommentGifPickerContent;

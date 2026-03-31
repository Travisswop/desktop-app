"use client";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import React, { useRef, useEffect } from "react";
import { BsEmojiSmile } from "react-icons/bs";

interface EmojiProps {
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  onEmojiSelect: (emoji: string) => void;
}

const CommentEmoji = ({
  onEmojiSelect,
  showEmojiPicker,
  setShowEmojiPicker,
}: EmojiProps) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker, setShowEmojiPicker]);

  return (
    <div className=" flex items-center" ref={pickerRef}>
      {/* ✅ Trigger button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowEmojiPicker(!showEmojiPicker);
        }}
        className=""
      >
        <BsEmojiSmile size={20} />
      </button>

      {/* ✅ Picker */}
      {showEmojiPicker && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-2 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiPicker
            onEmojiClick={(emojiData: EmojiClickData) =>
              onEmojiSelect(emojiData.emoji)
            }
            width={300}
            height={350}
          />
        </div>
      )}
    </div>
  );
};

export default CommentEmoji;

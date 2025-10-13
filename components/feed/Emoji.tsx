"use client";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import React, { useRef, useEffect } from "react";

interface EmojiProps {
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  onEmojiSelect: (emoji: string) => void;
}

const Emoji = ({
  onEmojiSelect,
  showEmojiPicker,
  setShowEmojiPicker,
}: EmojiProps) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    // Optionally close picker after selection:
    // setShowEmojiPicker(false);
  };

  // Close picker when clicking outside
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
      // Add a small delay to prevent immediate closure when opening
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker, setShowEmojiPicker]);

  if (!showEmojiPicker) return null;

  return (
    <div ref={pickerRef} onClick={(e) => e.stopPropagation()}>
      <EmojiPicker onEmojiClick={handleEmojiClick} width="100%" />
    </div>
  );
};

export default Emoji;

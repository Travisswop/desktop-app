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

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside, true);
  }, [showEmojiPicker, setShowEmojiPicker]);

  return (
    // relative here so absolute picker anchors correctly
    <div className="h-full flex items-center" ref={pickerRef}>
      {showEmojiPicker && (
        // adjust positioning as needed — bottom-full places it above the button
        <div className="h-full w-full lg:w-[80%] mx-auto">
          <EmojiPicker
            onEmojiClick={(emojiData: EmojiClickData) =>
              onEmojiSelect(emojiData.emoji)
            }
            width="100%"
            height={350}
          />
        </div>
      )}
    </div>
  );
};

export default Emoji;

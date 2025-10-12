import React, { useEffect, useRef } from "react";
import GifPicker from "gif-picker-react";

interface GifProps {
  mediaFilesLength: any;
  setMediaFiles: any;
  setFileError: any;
  showGifPicker: boolean;
  setShowGifPicker: (show: boolean) => void;
}

const GifPickerContent = ({
  mediaFilesLength,
  setMediaFiles,
  setFileError,
  showGifPicker,
  setShowGifPicker,
}: GifProps) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mediaFilesLength > 4) {
      setFileError("You can select a maximum of 4 files.");
    }
    if (mediaFilesLength === 4) {
      setShowGifPicker(false);
    }
  }, [mediaFilesLength, setFileError, setShowGifPicker]);

  const handleGifClick = (gifData: any) => {
    setMediaFiles((prevMediaFiles: any) => [
      ...prevMediaFiles,
      {
        type: "gif",
        src: gifData.url,
      },
    ]);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowGifPicker(false);
      }
    };

    if (showGifPicker) {
      // Add a small delay to prevent immediate closure when opening
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showGifPicker, setShowGifPicker]);

  if (!showGifPicker) return null;

  return (
    <div ref={pickerRef} onClick={(e) => e.stopPropagation()}>
      <GifPicker
        onGifClick={handleGifClick}
        tenorApiKey={"AIzaSyA-Xn0TwTUBNXY4EBbDCmnAs7o1XYIoZgU"}
        width="100%"
      />
    </div>
  );
};

export default GifPickerContent;

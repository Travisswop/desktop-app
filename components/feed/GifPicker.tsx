import React, { useEffect, useRef } from "react";
import GifPicker from "gif-picker-react";

interface GifProps {
  mediaFilesLength: any;
  setMediaFiles: any;
  setFileError: any;
  showGifPicker: boolean;
  setShowGifPicker: (show: boolean) => void;
  pickerRef: React.RefObject<HTMLDivElement>;
}

const GifPickerContent = ({
  mediaFilesLength,
  setMediaFiles,
  setFileError,
  showGifPicker,
  setShowGifPicker,
  pickerRef,
}: GifProps) => {
  // const pickerRef = useRef<HTMLDivElement>(null);

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
    if (!showGifPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is inside the pickerRef
      if (pickerRef.current && pickerRef.current.contains(target)) return;

      // Also check if click is inside any gif-picker portal elements
      // gif-picker-react renders with class "gpr-main" or inside a div with that structure
      const gifPickerPortal = document.querySelector(".gpr-main");
      if (gifPickerPortal && gifPickerPortal.contains(target)) return;

      setShowGifPicker(false);
    };

    document.addEventListener("mousedown", handleClickOutside, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [showGifPicker, setShowGifPicker, pickerRef]);

  if (!showGifPicker) return null;

  return (
    <div ref={pickerRef}>
      <GifPicker
        onGifClick={handleGifClick}
        tenorApiKey={process.env.NEXT_PUBLIC_TENOR_API_KEY || ""}
        width="100%"
      />
    </div>
  );
};

export default GifPickerContent;
